import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, attendeesTable, speakersTable, eventSpeakersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteByIdInput } from '../schema';
import { deleteEvent } from '../handlers/delete_event';

// Test input
const testInput: DeleteByIdInput = {
  id: 1
};

describe('deleteEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing event', async () => {
    // Create a test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        start_date: new Date('2024-12-25T10:00:00Z'),
        end_date: new Date('2024-12-25T12:00:00Z'),
        max_capacity: 100
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Delete the event
    const result = await deleteEvent({ id: eventId });

    // Should return success
    expect(result.success).toBe(true);

    // Verify event is deleted from database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .execute();

    expect(events).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent event', async () => {
    // Try to delete an event that doesn't exist
    const result = await deleteEvent({ id: 999 });

    // Should return false for non-existent event
    expect(result.success).toBe(false);
  });

  it('should cascade delete related attendees', async () => {
    // Create a test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        start_date: new Date('2024-12-25T10:00:00Z'),
        end_date: new Date('2024-12-25T12:00:00Z'),
        max_capacity: 100
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create attendees for the event
    await db.insert(attendeesTable)
      .values([
        {
          event_id: eventId,
          name: 'John Doe',
          email: 'john@example.com',
          registration_status: 'confirmed'
        },
        {
          event_id: eventId,
          name: 'Jane Smith',
          email: 'jane@example.com',
          registration_status: 'pending'
        }
      ])
      .execute();

    // Verify attendees were created
    const attendeesBefore = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.event_id, eventId))
      .execute();

    expect(attendeesBefore).toHaveLength(2);

    // Delete the event
    const result = await deleteEvent({ id: eventId });

    expect(result.success).toBe(true);

    // Verify attendees were cascade deleted
    const attendeesAfter = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.event_id, eventId))
      .execute();

    expect(attendeesAfter).toHaveLength(0);
  });

  it('should cascade delete event-speaker associations', async () => {
    // Create a test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        start_date: new Date('2024-12-25T10:00:00Z'),
        end_date: new Date('2024-12-25T12:00:00Z'),
        max_capacity: 100
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create a test speaker
    const speakerResult = await db.insert(speakersTable)
      .values({
        name: 'Test Speaker',
        bio: 'Test Bio',
        email: 'speaker@example.com',
        phone: '123-456-7890',
        expertise: 'Testing'
      })
      .returning()
      .execute();

    const speakerId = speakerResult[0].id;

    // Create event-speaker association
    await db.insert(eventSpeakersTable)
      .values({
        event_id: eventId,
        speaker_id: speakerId
      })
      .execute();

    // Verify association was created
    const associationsBefore = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.event_id, eventId))
      .execute();

    expect(associationsBefore).toHaveLength(1);

    // Delete the event
    const result = await deleteEvent({ id: eventId });

    expect(result.success).toBe(true);

    // Verify event-speaker association was cascade deleted
    const associationsAfter = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.event_id, eventId))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify speaker still exists (should not be deleted)
    const speakers = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speakerId))
      .execute();

    expect(speakers).toHaveLength(1);
  });

  it('should handle complete cascade deletion scenario', async () => {
    // Create a test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Conference 2024',
        description: 'Annual tech conference',
        location: 'Convention Center',
        start_date: new Date('2024-12-25T09:00:00Z'),
        end_date: new Date('2024-12-25T17:00:00Z'),
        max_capacity: 200
      })
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create speakers
    const speakerResults = await db.insert(speakersTable)
      .values([
        {
          name: 'Speaker One',
          bio: 'Expert in AI',
          email: 'speaker1@example.com',
          expertise: 'AI'
        },
        {
          name: 'Speaker Two',
          bio: 'Expert in Web Dev',
          email: 'speaker2@example.com',
          expertise: 'Web Development'
        }
      ])
      .returning()
      .execute();

    // Create event-speaker associations
    await db.insert(eventSpeakersTable)
      .values([
        { event_id: eventId, speaker_id: speakerResults[0].id },
        { event_id: eventId, speaker_id: speakerResults[1].id }
      ])
      .execute();

    // Create attendees
    await db.insert(attendeesTable)
      .values([
        {
          event_id: eventId,
          name: 'Attendee One',
          email: 'attendee1@example.com',
          registration_status: 'confirmed'
        },
        {
          event_id: eventId,
          name: 'Attendee Two',
          email: 'attendee2@example.com',
          registration_status: 'pending'
        },
        {
          event_id: eventId,
          name: 'Attendee Three',
          email: 'attendee3@example.com',
          registration_status: 'cancelled'
        }
      ])
      .execute();

    // Verify all data was created
    const eventsBefore = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).execute();
    const attendeesBefore = await db.select().from(attendeesTable).where(eq(attendeesTable.event_id, eventId)).execute();
    const associationsBefore = await db.select().from(eventSpeakersTable).where(eq(eventSpeakersTable.event_id, eventId)).execute();

    expect(eventsBefore).toHaveLength(1);
    expect(attendeesBefore).toHaveLength(3);
    expect(associationsBefore).toHaveLength(2);

    // Delete the event
    const result = await deleteEvent({ id: eventId });

    expect(result.success).toBe(true);

    // Verify everything related to the event was deleted
    const eventsAfter = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).execute();
    const attendeesAfter = await db.select().from(attendeesTable).where(eq(attendeesTable.event_id, eventId)).execute();
    const associationsAfter = await db.select().from(eventSpeakersTable).where(eq(eventSpeakersTable.event_id, eventId)).execute();

    expect(eventsAfter).toHaveLength(0);
    expect(attendeesAfter).toHaveLength(0);
    expect(associationsAfter).toHaveLength(0);

    // Verify speakers still exist (should not be cascade deleted)
    const speakersAfter = await db.select().from(speakersTable).execute();
    expect(speakersAfter).toHaveLength(2);
  });
});