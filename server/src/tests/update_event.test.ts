import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type UpdateEventInput, type CreateEventInput } from '../schema';
import { updateEvent } from '../handlers/update_event';
import { eq } from 'drizzle-orm';

// Helper function to create a test event
const createTestEvent = async (): Promise<number> => {
  const testEventData: CreateEventInput = {
    title: 'Original Event',
    description: 'Original description',
    location: 'Original Location',
    start_date: new Date('2024-01-15T10:00:00Z'),
    end_date: new Date('2024-01-15T18:00:00Z'),
    max_capacity: 100
  };

  const result = await db.insert(eventsTable)
    .values({
      title: testEventData.title,
      description: testEventData.description,
      location: testEventData.location,
      start_date: testEventData.start_date,
      end_date: testEventData.end_date,
      max_capacity: testEventData.max_capacity
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updateEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update event title', async () => {
    const eventId = await createTestEvent();
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      title: 'Updated Event Title'
    };

    const result = await updateEvent(updateInput);

    expect(result.id).toEqual(eventId);
    expect(result.title).toEqual('Updated Event Title');
    expect(result.description).toEqual('Original description');
    expect(result.location).toEqual('Original Location');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const eventId = await createTestEvent();
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      title: 'Updated Title',
      description: 'Updated description',
      location: 'Updated Location',
      max_capacity: 200,
      is_active: false
    };

    const result = await updateEvent(updateInput);

    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Updated description');
    expect(result.location).toEqual('Updated Location');
    expect(result.max_capacity).toEqual(200);
    expect(result.is_active).toEqual(false);
  });

  it('should update description to null', async () => {
    const eventId = await createTestEvent();
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      description: null
    };

    const result = await updateEvent(updateInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Original Event'); // Other fields unchanged
  });

  it('should update event dates', async () => {
    const eventId = await createTestEvent();
    
    const newStartDate = new Date('2024-02-01T09:00:00Z');
    const newEndDate = new Date('2024-02-01T17:00:00Z');
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      start_date: newStartDate,
      end_date: newEndDate
    };

    const result = await updateEvent(updateInput);

    expect(result.start_date).toEqual(newStartDate);
    expect(result.end_date).toEqual(newEndDate);
  });

  it('should persist changes to database', async () => {
    const eventId = await createTestEvent();
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      title: 'Database Test Event',
      max_capacity: 250
    };

    await updateEvent(updateInput);

    // Query database directly to verify changes
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].title).toEqual('Database Test Event');
    expect(events[0].max_capacity).toEqual(250);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const eventId = await createTestEvent();
    
    // Get original timestamp
    const originalEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();
    
    const originalUpdatedAt = originalEvent[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateEventInput = {
      id: eventId,
      title: 'Timestamp Test'
    };

    const result = await updateEvent(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent event', async () => {
    const updateInput: UpdateEventInput = {
      id: 99999,
      title: 'Non-existent Event'
    };

    expect(updateEvent(updateInput)).rejects.toThrow(/Event with ID 99999 not found/i);
  });

  it('should validate date logic when updating start date only', async () => {
    const eventId = await createTestEvent();
    
    // Try to set start_date after the existing end_date
    const updateInput: UpdateEventInput = {
      id: eventId,
      start_date: new Date('2024-01-15T19:00:00Z') // After original end_date
    };

    expect(updateEvent(updateInput)).rejects.toThrow(/End date must be after start date/i);
  });

  it('should validate date logic when updating end date only', async () => {
    const eventId = await createTestEvent();
    
    // Try to set end_date before the existing start_date
    const updateInput: UpdateEventInput = {
      id: eventId,
      end_date: new Date('2024-01-15T09:00:00Z') // Before original start_date
    };

    expect(updateEvent(updateInput)).rejects.toThrow(/End date must be after start date/i);
  });

  it('should validate date logic when updating both dates', async () => {
    const eventId = await createTestEvent();
    
    const updateInput: UpdateEventInput = {
      id: eventId,
      start_date: new Date('2024-02-01T18:00:00Z'),
      end_date: new Date('2024-02-01T17:00:00Z') // Before start_date
    };

    expect(updateEvent(updateInput)).rejects.toThrow(/End date must be after start date/i);
  });

  it('should handle partial updates without affecting other fields', async () => {
    const eventId = await createTestEvent();
    
    // Only update is_active flag
    const updateInput: UpdateEventInput = {
      id: eventId,
      is_active: false
    };

    const result = await updateEvent(updateInput);

    // Verify only is_active and updated_at changed
    expect(result.is_active).toEqual(false);
    expect(result.title).toEqual('Original Event');
    expect(result.description).toEqual('Original description');
    expect(result.location).toEqual('Original Location');
    expect(result.max_capacity).toEqual(100);
    expect(result.current_bookings).toEqual(0);
  });
});