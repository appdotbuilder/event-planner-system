import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { speakersTable, eventsTable, eventSpeakersTable } from '../db/schema';
import { type DeleteByIdInput, type CreateSpeakerInput, type CreateEventInput, type AssignSpeakerInput } from '../schema';
import { deleteSpeaker } from '../handlers/delete_speaker';
import { eq } from 'drizzle-orm';

const testSpeakerInput: CreateSpeakerInput = {
  name: 'John Doe',
  bio: 'Experienced speaker',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  expertise: 'Technology'
};

const testEventInput: CreateEventInput = {
  title: 'Tech Conference',
  description: 'A great tech event',
  location: 'Convention Center',
  start_date: new Date('2024-03-15'),
  end_date: new Date('2024-03-16'),
  max_capacity: 100
};

describe('deleteSpeaker', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a speaker successfully', async () => {
    // Create test speaker
    const speakerResult = await db.insert(speakersTable)
      .values(testSpeakerInput)
      .returning()
      .execute();

    const speaker = speakerResult[0];
    const deleteInput: DeleteByIdInput = { id: speaker.id };

    // Delete the speaker
    const result = await deleteSpeaker(deleteInput);

    expect(result.success).toBe(true);

    // Verify speaker is deleted from database
    const deletedSpeaker = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speaker.id))
      .execute();

    expect(deletedSpeaker).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent speaker', async () => {
    const deleteInput: DeleteByIdInput = { id: 999 };

    const result = await deleteSpeaker(deleteInput);

    expect(result.success).toBe(false);
  });

  it('should cascade delete event-speaker associations', async () => {
    // Create test speaker
    const speakerResult = await db.insert(speakersTable)
      .values(testSpeakerInput)
      .returning()
      .execute();

    const speaker = speakerResult[0];

    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values(testEventInput)
      .returning()
      .execute();

    const event = eventResult[0];

    // Create event-speaker association
    await db.insert(eventSpeakersTable)
      .values({
        event_id: event.id,
        speaker_id: speaker.id
      })
      .execute();

    // Verify association exists before deletion
    const associationsBefore = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.speaker_id, speaker.id))
      .execute();

    expect(associationsBefore).toHaveLength(1);

    // Delete the speaker
    const deleteInput: DeleteByIdInput = { id: speaker.id };
    const result = await deleteSpeaker(deleteInput);

    expect(result.success).toBe(true);

    // Verify speaker is deleted
    const deletedSpeaker = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speaker.id))
      .execute();

    expect(deletedSpeaker).toHaveLength(0);

    // Verify event-speaker associations are cascade deleted
    const associationsAfter = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.speaker_id, speaker.id))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify event still exists (only association was deleted)
    const existingEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, event.id))
      .execute();

    expect(existingEvent).toHaveLength(1);
  });

  it('should delete speaker with multiple event associations', async () => {
    // Create test speaker
    const speakerResult = await db.insert(speakersTable)
      .values(testSpeakerInput)
      .returning()
      .execute();

    const speaker = speakerResult[0];

    // Create multiple events
    const event1Result = await db.insert(eventsTable)
      .values({
        ...testEventInput,
        title: 'Event 1'
      })
      .returning()
      .execute();

    const event2Result = await db.insert(eventsTable)
      .values({
        ...testEventInput,
        title: 'Event 2',
        start_date: new Date('2024-04-15'),
        end_date: new Date('2024-04-16')
      })
      .returning()
      .execute();

    const event1 = event1Result[0];
    const event2 = event2Result[0];

    // Create multiple event-speaker associations
    await db.insert(eventSpeakersTable)
      .values([
        { event_id: event1.id, speaker_id: speaker.id },
        { event_id: event2.id, speaker_id: speaker.id }
      ])
      .execute();

    // Verify multiple associations exist
    const associationsBefore = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.speaker_id, speaker.id))
      .execute();

    expect(associationsBefore).toHaveLength(2);

    // Delete the speaker
    const deleteInput: DeleteByIdInput = { id: speaker.id };
    const result = await deleteSpeaker(deleteInput);

    expect(result.success).toBe(true);

    // Verify all associations are deleted
    const associationsAfter = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.speaker_id, speaker.id))
      .execute();

    expect(associationsAfter).toHaveLength(0);

    // Verify both events still exist
    const existingEvents = await db.select()
      .from(eventsTable)
      .execute();

    expect(existingEvents).toHaveLength(2);
  });

  it('should handle deletion of speaker with no associations', async () => {
    // Create test speaker without any event associations
    const speakerResult = await db.insert(speakersTable)
      .values(testSpeakerInput)
      .returning()
      .execute();

    const speaker = speakerResult[0];
    const deleteInput: DeleteByIdInput = { id: speaker.id };

    // Delete the speaker
    const result = await deleteSpeaker(deleteInput);

    expect(result.success).toBe(true);

    // Verify speaker is deleted
    const deletedSpeaker = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speaker.id))
      .execute();

    expect(deletedSpeaker).toHaveLength(0);
  });
});