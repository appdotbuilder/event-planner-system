import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, attendeesTable } from '../db/schema';
import { type DeleteByIdInput, type CreateEventInput, type CreateAttendeeInput } from '../schema';
import { deleteAttendee } from '../handlers/delete_attendee';
import { eq } from 'drizzle-orm';

// Test inputs
const testEvent: CreateEventInput = {
  title: 'Test Event',
  description: 'A test event',
  location: 'Test Location',
  start_date: new Date('2024-06-01T10:00:00Z'),
  end_date: new Date('2024-06-01T12:00:00Z'),
  max_capacity: 100
};

const testAttendee: CreateAttendeeInput = {
  event_id: 1, // Will be updated with actual event ID
  name: 'John Doe',
  email: 'john@example.com',
  registration_status: 'confirmed'
};

describe('deleteAttendee', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an attendee and update event bookings count', async () => {
    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        ...testEvent,
        current_bookings: 1
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create test attendee
    const attendeeResult = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId
      })
      .returning()
      .execute();

    const attendeeId = attendeeResult[0].id;

    // Delete the attendee
    const deleteInput: DeleteByIdInput = { id: attendeeId };
    const result = await deleteAttendee(deleteInput);

    expect(result.success).toBe(true);

    // Verify attendee was deleted
    const attendees = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, attendeeId))
      .execute();

    expect(attendees).toHaveLength(0);

    // Verify event's current_bookings was decremented
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].current_bookings).toBe(0);
    expect(events[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple attendees correctly', async () => {
    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        ...testEvent,
        current_bookings: 3
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create multiple attendees
    const attendee1 = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId,
        name: 'John Doe'
      })
      .returning()
      .execute();

    const attendee2 = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId,
        name: 'Jane Smith',
        email: 'jane@example.com'
      })
      .returning()
      .execute();

    const attendee3 = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId,
        name: 'Bob Wilson',
        email: 'bob@example.com'
      })
      .returning()
      .execute();

    // Delete one attendee
    const deleteInput: DeleteByIdInput = { id: attendee2[0].id };
    const result = await deleteAttendee(deleteInput);

    expect(result.success).toBe(true);

    // Verify only the targeted attendee was deleted
    const remainingAttendees = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.event_id, eventId))
      .execute();

    expect(remainingAttendees).toHaveLength(2);
    expect(remainingAttendees.map(a => a.name)).toEqual(['John Doe', 'Bob Wilson']);

    // Verify event's current_bookings was decremented by 1
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events[0].current_bookings).toBe(2);
  });

  it('should return false for non-existent attendee', async () => {
    const deleteInput: DeleteByIdInput = { id: 999 };
    const result = await deleteAttendee(deleteInput);

    expect(result.success).toBe(false);
  });

  it('should handle attendee with zero bookings event', async () => {
    // Create test event with 0 bookings
    const eventResult = await db.insert(eventsTable)
      .values({
        ...testEvent,
        current_bookings: 1
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create test attendee
    const attendeeResult = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId
      })
      .returning()
      .execute();

    const attendeeId = attendeeResult[0].id;

    // Delete the attendee
    const deleteInput: DeleteByIdInput = { id: attendeeId };
    const result = await deleteAttendee(deleteInput);

    expect(result.success).toBe(true);

    // Verify event's current_bookings went to 0 (not negative)
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events[0].current_bookings).toBe(0);
  });

  it('should handle attendees with different registration statuses', async () => {
    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        ...testEvent,
        current_bookings: 2
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create attendees with different statuses
    const pendingAttendee = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId,
        name: 'Pending User',
        registration_status: 'pending'
      })
      .returning()
      .execute();

    const cancelledAttendee = await db.insert(attendeesTable)
      .values({
        ...testAttendee,
        event_id: eventId,
        name: 'Cancelled User',
        email: 'cancelled@example.com',
        registration_status: 'cancelled'
      })
      .returning()
      .execute();

    // Delete pending attendee
    const deleteInput: DeleteByIdInput = { id: pendingAttendee[0].id };
    const result = await deleteAttendee(deleteInput);

    expect(result.success).toBe(true);

    // Verify current_bookings was still decremented
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events[0].current_bookings).toBe(1);

    // Verify cancelled attendee still exists
    const remainingAttendees = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.event_id, eventId))
      .execute();

    expect(remainingAttendees).toHaveLength(1);
    expect(remainingAttendees[0].name).toBe('Cancelled User');
  });
});