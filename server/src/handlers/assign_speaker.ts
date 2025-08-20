import { db } from '../db';
import { eventsTable, speakersTable, eventSpeakersTable } from '../db/schema';
import { type AssignSpeakerInput, type EventSpeaker } from '../schema';
import { eq, and } from 'drizzle-orm';

export const assignSpeakerToEvent = async (input: AssignSpeakerInput): Promise<EventSpeaker> => {
  try {
    // Verify that the event exists
    const event = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, input.event_id))
      .execute();

    if (event.length === 0) {
      throw new Error(`Event with id ${input.event_id} not found`);
    }

    // Verify that the speaker exists
    const speaker = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, input.speaker_id))
      .execute();

    if (speaker.length === 0) {
      throw new Error(`Speaker with id ${input.speaker_id} not found`);
    }

    // Check if the assignment already exists
    const existingAssignment = await db.select()
      .from(eventSpeakersTable)
      .where(
        and(
          eq(eventSpeakersTable.event_id, input.event_id),
          eq(eventSpeakersTable.speaker_id, input.speaker_id)
        )
      )
      .execute();

    if (existingAssignment.length > 0) {
      throw new Error(`Speaker with id ${input.speaker_id} is already assigned to event with id ${input.event_id}`);
    }

    // Create the assignment
    const result = await db.insert(eventSpeakersTable)
      .values({
        event_id: input.event_id,
        speaker_id: input.speaker_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Speaker assignment failed:', error);
    throw error;
  }
};

export const unassignSpeakerFromEvent = async (input: AssignSpeakerInput): Promise<{ success: boolean }> => {
  try {
    // Delete the assignment
    const result = await db.delete(eventSpeakersTable)
      .where(
        and(
          eq(eventSpeakersTable.event_id, input.event_id),
          eq(eventSpeakersTable.speaker_id, input.speaker_id)
        )
      )
      .returning()
      .execute();

    // Return success status based on whether a record was deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Speaker unassignment failed:', error);
    throw error;
  }
};