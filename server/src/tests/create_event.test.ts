import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { createEvent } from '../handlers/create_event';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateEventInput = {
  title: 'Tech Conference 2024',
  description: 'Annual technology conference featuring industry leaders',
  location: 'Convention Center, San Francisco',
  start_date: new Date('2024-06-15T09:00:00Z'),
  end_date: new Date('2024-06-17T17:00:00Z'),
  max_capacity: 500
};

// Test input with minimal required fields (nullable description)
const minimalInput: CreateEventInput = {
  title: 'Workshop Series',
  description: null,
  location: 'Online',
  start_date: new Date('2024-07-01T10:00:00Z'),
  end_date: new Date('2024-07-01T16:00:00Z'),
  max_capacity: 50
};

describe('createEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an event with all fields', async () => {
    const result = await createEvent(testInput);

    // Basic field validation
    expect(result.title).toEqual('Tech Conference 2024');
    expect(result.description).toEqual(testInput.description);
    expect(result.location).toEqual('Convention Center, San Francisco');
    expect(result.start_date).toEqual(testInput.start_date);
    expect(result.end_date).toEqual(testInput.end_date);
    expect(result.max_capacity).toEqual(500);
    expect(result.current_bookings).toEqual(0); // Default value
    expect(result.is_active).toEqual(true); // Default value
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an event with nullable description', async () => {
    const result = await createEvent(minimalInput);

    // Verify nullable field handling
    expect(result.title).toEqual('Workshop Series');
    expect(result.description).toBeNull();
    expect(result.location).toEqual('Online');
    expect(result.start_date).toEqual(minimalInput.start_date);
    expect(result.end_date).toEqual(minimalInput.end_date);
    expect(result.max_capacity).toEqual(50);
    expect(result.current_bookings).toEqual(0);
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
  });

  it('should save event to database', async () => {
    const result = await createEvent(testInput);

    // Query using proper drizzle syntax
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Tech Conference 2024');
    expect(events[0].description).toEqual(testInput.description);
    expect(events[0].location).toEqual('Convention Center, San Francisco');
    expect(events[0].start_date).toEqual(testInput.start_date);
    expect(events[0].end_date).toEqual(testInput.end_date);
    expect(events[0].max_capacity).toEqual(500);
    expect(events[0].current_bookings).toEqual(0);
    expect(events[0].is_active).toEqual(true);
    expect(events[0].created_at).toBeInstanceOf(Date);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple events with unique IDs', async () => {
    const result1 = await createEvent(testInput);
    const result2 = await createEvent(minimalInput);

    // Verify different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).not.toEqual(result2.title);
    
    // Verify both are saved in database
    const events = await db.select()
      .from(eventsTable)
      .execute();

    expect(events).toHaveLength(2);
    
    const savedIds = events.map(e => e.id).sort();
    expect(savedIds).toEqual([result1.id, result2.id].sort());
  });

  it('should handle date objects correctly', async () => {
    // Test with different date formats
    const dateInput: CreateEventInput = {
      title: 'Date Test Event',
      description: 'Testing date handling',
      location: 'Test Location',
      start_date: new Date('2024-12-01T08:00:00.000Z'),
      end_date: new Date('2024-12-01T20:00:00.000Z'),
      max_capacity: 100
    };

    const result = await createEvent(dateInput);

    // Verify date preservation
    expect(result.start_date).toBeInstanceOf(Date);
    expect(result.end_date).toBeInstanceOf(Date);
    expect(result.start_date.toISOString()).toEqual('2024-12-01T08:00:00.000Z');
    expect(result.end_date.toISOString()).toEqual('2024-12-01T20:00:00.000Z');
    
    // Verify date relationship
    expect(result.end_date > result.start_date).toBe(true);
  });

  it('should set correct default values', async () => {
    const result = await createEvent(testInput);

    // Verify default values are set correctly
    expect(result.current_bookings).toEqual(0);
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last 5 seconds)
    const now = new Date();
    const timeDiff = now.getTime() - result.created_at.getTime();
    expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds
  });
});