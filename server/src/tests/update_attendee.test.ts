import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, attendeesTable } from '../db/schema';
import { type UpdateAttendeeInput } from '../schema';
import { updateAttendee } from '../handlers/update_attendee';
import { eq } from 'drizzle-orm';

describe('updateAttendee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test event
  const createTestEvent = async () => {
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'A test event',
        location: 'Test Location',
        start_date: new Date('2024-06-01'),
        end_date: new Date('2024-06-02'),
        max_capacity: 100,
        current_bookings: 0
      })
      .returning()
      .execute();
    return eventResult[0];
  };

  // Helper function to create test attendee
  const createTestAttendee = async (eventId: number, status: 'pending' | 'confirmed' | 'cancelled' = 'pending') => {
    const attendeeResult = await db.insert(attendeesTable)
      .values({
        event_id: eventId,
        name: 'John Doe',
        email: 'john@example.com',
        registration_status: status
      })
      .returning()
      .execute();
    return attendeeResult[0];
  };

  it('should update attendee basic information', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id);

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      name: 'Jane Smith',
      email: 'jane@example.com'
    };

    const result = await updateAttendee(updateInput);

    expect(result.id).toEqual(attendee.id);
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toEqual('jane@example.com');
    expect(result.registration_status).toEqual('pending'); // Unchanged
    expect(result.event_id).toEqual(event.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(attendee.updated_at.getTime());
  });

  it('should update only specified fields', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id);

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      name: 'Updated Name'
    };

    const result = await updateAttendee(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('john@example.com'); // Unchanged
    expect(result.registration_status).toEqual('pending'); // Unchanged
  });

  it('should update registration status from pending to confirmed', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id, 'pending');

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      registration_status: 'confirmed'
    };

    const result = await updateAttendee(updateInput);

    expect(result.registration_status).toEqual('confirmed');

    // Check that event booking count increased
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(1);
  });

  it('should update registration status from confirmed to cancelled', async () => {
    const event = await createTestEvent();
    // Start with event having 1 booking
    await db.update(eventsTable)
      .set({ current_bookings: 1 })
      .where(eq(eventsTable.id, event.id))
      .execute();

    const attendee = await createTestAttendee(event.id, 'confirmed');

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      registration_status: 'cancelled'
    };

    const result = await updateAttendee(updateInput);

    expect(result.registration_status).toEqual('cancelled');

    // Check that event booking count decreased
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(0);
  });

  it('should update registration status from pending to cancelled without changing booking count', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id, 'pending');

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      registration_status: 'cancelled'
    };

    const result = await updateAttendee(updateInput);

    expect(result.registration_status).toEqual('cancelled');

    // Check that event booking count remained the same
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(0);
  });

  it('should update registration status from cancelled to confirmed', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id, 'cancelled');

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      registration_status: 'confirmed'
    };

    const result = await updateAttendee(updateInput);

    expect(result.registration_status).toEqual('confirmed');

    // Check that event booking count increased
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(1);
  });

  it('should handle multiple attendees booking count correctly', async () => {
    const event = await createTestEvent();
    const attendee1 = await createTestAttendee(event.id, 'pending');
    const attendee2 = await createTestAttendee(event.id, 'pending');

    // Confirm first attendee
    await updateAttendee({
      id: attendee1.id,
      registration_status: 'confirmed'
    });

    // Confirm second attendee
    await updateAttendee({
      id: attendee2.id,
      registration_status: 'confirmed'
    });

    // Check booking count
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].current_bookings).toEqual(2);

    // Cancel first attendee
    await updateAttendee({
      id: attendee1.id,
      registration_status: 'cancelled'
    });

    // Check booking count decreased
    const finalEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(finalEvent[0].current_bookings).toEqual(1);
  });

  it('should save updated attendee to database', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id);

    const updateInput: UpdateAttendeeInput = {
      id: attendee.id,
      name: 'Database Test',
      email: 'db@test.com',
      registration_status: 'confirmed'
    };

    await updateAttendee(updateInput);

    // Verify data was saved to database
    const dbAttendee = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, attendee.id))
      .execute();

    expect(dbAttendee).toHaveLength(1);
    expect(dbAttendee[0].name).toEqual('Database Test');
    expect(dbAttendee[0].email).toEqual('db@test.com');
    expect(dbAttendee[0].registration_status).toEqual('confirmed');
    expect(dbAttendee[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when attendee does not exist', async () => {
    const updateInput: UpdateAttendeeInput = {
      id: 99999,
      name: 'Non-existent'
    };

    await expect(updateAttendee(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update event updated_at timestamp when booking count changes', async () => {
    const event = await createTestEvent();
    const attendee = await createTestAttendee(event.id, 'pending');

    const originalEventTime = event.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Confirm attendee (should update event booking count)
    await updateAttendee({
      id: attendee.id,
      registration_status: 'confirmed'
    });

    // Check that event updated_at was changed
    const updatedEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(updatedEvent[0].updated_at.getTime()).toBeGreaterThan(originalEventTime.getTime());
  });
});