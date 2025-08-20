import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { getEvents, getEventById } from '../handlers/get_events';

// Test event data
const testEvent1: CreateEventInput = {
  title: 'Tech Conference 2024',
  description: 'Annual technology conference',
  location: 'Convention Center',
  start_date: new Date('2024-06-15T09:00:00Z'),
  end_date: new Date('2024-06-15T17:00:00Z'),
  max_capacity: 200
};

const testEvent2: CreateEventInput = {
  title: 'Workshop: AI Basics',
  description: null,
  location: 'Room A',
  start_date: new Date('2024-07-10T14:00:00Z'),
  end_date: new Date('2024-07-10T16:00:00Z'),
  max_capacity: 50
};

describe('getEvents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no events exist', async () => {
    const result = await getEvents();
    expect(result).toEqual([]);
  });

  it('should fetch all events from database', async () => {
    // Create test events
    await db.insert(eventsTable).values([
      {
        title: testEvent1.title,
        description: testEvent1.description,
        location: testEvent1.location,
        start_date: testEvent1.start_date,
        end_date: testEvent1.end_date,
        max_capacity: testEvent1.max_capacity
      },
      {
        title: testEvent2.title,
        description: testEvent2.description,
        location: testEvent2.location,
        start_date: testEvent2.start_date,
        end_date: testEvent2.end_date,
        max_capacity: testEvent2.max_capacity
      }
    ]).execute();

    const result = await getEvents();

    expect(result).toHaveLength(2);
    
    // Verify first event
    const event1 = result.find(e => e.title === 'Tech Conference 2024');
    expect(event1).toBeDefined();
    expect(event1!.title).toEqual('Tech Conference 2024');
    expect(event1!.description).toEqual('Annual technology conference');
    expect(event1!.location).toEqual('Convention Center');
    expect(event1!.max_capacity).toEqual(200);
    expect(event1!.current_bookings).toEqual(0); // Default value
    expect(event1!.is_active).toEqual(true); // Default value
    expect(event1!.id).toBeDefined();
    expect(event1!.created_at).toBeInstanceOf(Date);
    expect(event1!.updated_at).toBeInstanceOf(Date);

    // Verify second event
    const event2 = result.find(e => e.title === 'Workshop: AI Basics');
    expect(event2).toBeDefined();
    expect(event2!.title).toEqual('Workshop: AI Basics');
    expect(event2!.description).toBeNull();
    expect(event2!.location).toEqual('Room A');
    expect(event2!.max_capacity).toEqual(50);
    expect(event2!.current_bookings).toEqual(0);
    expect(event2!.is_active).toEqual(true);
    expect(event2!.id).toBeDefined();
  });

  it('should include events with different booking statuses', async () => {
    // Create events with different current_bookings values
    await db.insert(eventsTable).values([
      {
        title: 'Full Event',
        description: 'This event is full',
        location: 'Room B',
        start_date: new Date('2024-08-01T10:00:00Z'),
        end_date: new Date('2024-08-01T12:00:00Z'),
        max_capacity: 10,
        current_bookings: 10 // Full
      },
      {
        title: 'Partial Event',
        description: 'This event has some bookings',
        location: 'Room C',
        start_date: new Date('2024-08-02T10:00:00Z'),
        end_date: new Date('2024-08-02T12:00:00Z'),
        max_capacity: 20,
        current_bookings: 15 // Partially booked
      },
      {
        title: 'Inactive Event',
        description: 'This event is inactive',
        location: 'Room D',
        start_date: new Date('2024-08-03T10:00:00Z'),
        end_date: new Date('2024-08-03T12:00:00Z'),
        max_capacity: 30,
        current_bookings: 5,
        is_active: false
      }
    ]).execute();

    const result = await getEvents();

    expect(result).toHaveLength(3);
    
    const fullEvent = result.find(e => e.title === 'Full Event');
    expect(fullEvent!.current_bookings).toEqual(10);
    expect(fullEvent!.max_capacity).toEqual(10);
    
    const partialEvent = result.find(e => e.title === 'Partial Event');
    expect(partialEvent!.current_bookings).toEqual(15);
    expect(partialEvent!.max_capacity).toEqual(20);
    
    const inactiveEvent = result.find(e => e.title === 'Inactive Event');
    expect(inactiveEvent!.is_active).toEqual(false);
    expect(inactiveEvent!.current_bookings).toEqual(5);
  });
});

describe('getEventById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when event does not exist', async () => {
    const result = await getEventById(999);
    expect(result).toBeNull();
  });

  it('should fetch event by ID from database', async () => {
    // Create test event
    const insertResult = await db.insert(eventsTable).values({
      title: testEvent1.title,
      description: testEvent1.description,
      location: testEvent1.location,
      start_date: testEvent1.start_date,
      end_date: testEvent1.end_date,
      max_capacity: testEvent1.max_capacity
    }).returning().execute();

    const createdEvent = insertResult[0];
    const result = await getEventById(createdEvent.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdEvent.id);
    expect(result!.title).toEqual('Tech Conference 2024');
    expect(result!.description).toEqual('Annual technology conference');
    expect(result!.location).toEqual('Convention Center');
    expect(result!.max_capacity).toEqual(200);
    expect(result!.current_bookings).toEqual(0);
    expect(result!.is_active).toEqual(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.start_date).toBeInstanceOf(Date);
    expect(result!.end_date).toBeInstanceOf(Date);
  });

  it('should fetch event with null description', async () => {
    // Create event with null description
    const insertResult = await db.insert(eventsTable).values({
      title: testEvent2.title,
      description: testEvent2.description, // null
      location: testEvent2.location,
      start_date: testEvent2.start_date,
      end_date: testEvent2.end_date,
      max_capacity: testEvent2.max_capacity
    }).returning().execute();

    const createdEvent = insertResult[0];
    const result = await getEventById(createdEvent.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdEvent.id);
    expect(result!.title).toEqual('Workshop: AI Basics');
    expect(result!.description).toBeNull();
    expect(result!.location).toEqual('Room A');
    expect(result!.max_capacity).toEqual(50);
  });

  it('should fetch event with custom booking and active status', async () => {
    // Create event with custom values
    const insertResult = await db.insert(eventsTable).values({
      title: 'Custom Event',
      description: 'Event with custom values',
      location: 'Custom Location',
      start_date: new Date('2024-09-01T10:00:00Z'),
      end_date: new Date('2024-09-01T12:00:00Z'),
      max_capacity: 100,
      current_bookings: 75,
      is_active: false
    }).returning().execute();

    const createdEvent = insertResult[0];
    const result = await getEventById(createdEvent.id);

    expect(result).not.toBeNull();
    expect(result!.current_bookings).toEqual(75);
    expect(result!.is_active).toEqual(false);
    expect(result!.max_capacity).toEqual(100);
    expect(result!.title).toEqual('Custom Event');
  });

  it('should return first event when multiple events exist', async () => {
    // Create multiple events
    const insertResults = await db.insert(eventsTable).values([
      {
        title: 'First Event',
        description: 'First event description',
        location: 'Location 1',
        start_date: new Date('2024-10-01T10:00:00Z'),
        end_date: new Date('2024-10-01T12:00:00Z'),
        max_capacity: 50
      },
      {
        title: 'Second Event',
        description: 'Second event description',
        location: 'Location 2',
        start_date: new Date('2024-10-02T10:00:00Z'),
        end_date: new Date('2024-10-02T12:00:00Z'),
        max_capacity: 100
      }
    ]).returning().execute();

    // Fetch first event by ID
    const firstEvent = await getEventById(insertResults[0].id);
    expect(firstEvent).not.toBeNull();
    expect(firstEvent!.title).toEqual('First Event');
    expect(firstEvent!.id).toEqual(insertResults[0].id);

    // Fetch second event by ID
    const secondEvent = await getEventById(insertResults[1].id);
    expect(secondEvent).not.toBeNull();
    expect(secondEvent!.title).toEqual('Second Event');
    expect(secondEvent!.id).toEqual(insertResults[1].id);
  });
});