import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { attendeesTable, eventsTable } from '../db/schema';
import { type CreateAttendeeInput } from '../schema';
import { createAttendee } from '../handlers/create_attendee';
import { eq } from 'drizzle-orm';

// Helper to create a test event
const createTestEvent = async (overrides: Partial<any> = {}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const result = await db.insert(eventsTable)
    .values({
      title: 'Test Event',
      description: 'A test event',
      location: 'Test Location',
      start_date: tomorrow,
      end_date: dayAfterTomorrow,
      max_capacity: 10,
      current_bookings: 0,
      is_active: true,
      ...overrides
    })
    .returning()
    .execute();

  return result[0];
};

// Test input for creating attendees
const testInput: CreateAttendeeInput = {
  event_id: 1, // Will be set dynamically in tests
  name: 'John Doe',
  email: 'john.doe@example.com',
  registration_status: 'pending'
};

describe('createAttendee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an attendee successfully', async () => {
    // Create a test event first
    const event = await createTestEvent();
    const input = { ...testInput, event_id: event.id };

    const result = await createAttendee(input);

    // Verify attendee fields
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.registration_status).toEqual('pending');
    expect(result.event_id).toEqual(event.id);
    expect(result.id).toBeDefined();
    expect(result.registered_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save attendee to database', async () => {
    const event = await createTestEvent();
    const input = { ...testInput, event_id: event.id };

    const result = await createAttendee(input);

    // Query the database to verify attendee was saved
    const attendees = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, result.id))
      .execute();

    expect(attendees).toHaveLength(1);
    expect(attendees[0].name).toEqual('John Doe');
    expect(attendees[0].email).toEqual('john.doe@example.com');
    expect(attendees[0].event_id).toEqual(event.id);
    expect(attendees[0].registration_status).toEqual('pending');
  });

  it('should increment event current_bookings count', async () => {
    const event = await createTestEvent({ current_bookings: 3 });
    const input = { ...testInput, event_id: event.id };

    await createAttendee(input);

    // Check that current_bookings was incremented
    const updatedEvents = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvents[0].current_bookings).toEqual(4);
    expect(updatedEvents[0].updated_at).toBeInstanceOf(Date);
  });

  it('should use default registration status when not provided', async () => {
    const event = await createTestEvent();
    const inputWithoutStatus = {
      event_id: event.id,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      registration_status: 'pending' as const // This is the default from Zod
    };

    const result = await createAttendee(inputWithoutStatus);

    expect(result.registration_status).toEqual('pending');
  });

  it('should throw error when event does not exist', async () => {
    const input = { ...testInput, event_id: 999 };

    await expect(createAttendee(input)).rejects.toThrow(/Event with id 999 not found/i);
  });

  it('should throw error when event is inactive', async () => {
    const event = await createTestEvent({ is_active: false });
    const input = { ...testInput, event_id: event.id };

    await expect(createAttendee(input)).rejects.toThrow(/Cannot register for an inactive event/i);
  });

  it('should throw error when event is at maximum capacity', async () => {
    const event = await createTestEvent({ 
      max_capacity: 2, 
      current_bookings: 2 
    });
    const input = { ...testInput, event_id: event.id };

    await expect(createAttendee(input)).rejects.toThrow(/Event is at maximum capacity/i);
  });

  it('should throw error when event has already started', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();

    const event = await createTestEvent({ 
      start_date: yesterday,
      end_date: today
    });
    const input = { ...testInput, event_id: event.id };

    await expect(createAttendee(input)).rejects.toThrow(/Cannot register for an event that has already started/i);
  });

  it('should create multiple attendees for the same event', async () => {
    const event = await createTestEvent({ max_capacity: 5 });
    
    // Create first attendee
    const input1 = { ...testInput, event_id: event.id };
    const attendee1 = await createAttendee(input1);

    // Create second attendee
    const input2 = { 
      ...testInput, 
      event_id: event.id, 
      name: 'Jane Smith', 
      email: 'jane.smith@example.com' 
    };
    const attendee2 = await createAttendee(input2);

    // Verify both attendees exist
    expect(attendee1.id).not.toEqual(attendee2.id);
    expect(attendee1.name).toEqual('John Doe');
    expect(attendee2.name).toEqual('Jane Smith');

    // Verify event booking count
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(2);
  });

  it('should handle different registration statuses', async () => {
    const event = await createTestEvent();
    
    const confirmedInput = { 
      ...testInput, 
      event_id: event.id, 
      registration_status: 'confirmed' as const 
    };
    
    const result = await createAttendee(confirmedInput);

    expect(result.registration_status).toEqual('confirmed');
  });
});