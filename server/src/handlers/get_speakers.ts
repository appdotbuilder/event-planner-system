import { db } from '../db';
import { speakersTable, eventSpeakersTable } from '../db/schema';
import { type Speaker } from '../schema';
import { eq } from 'drizzle-orm';

export const getSpeakers = async (): Promise<Speaker[]> => {
  try {
    const results = await db.select()
      .from(speakersTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch speakers:', error);
    throw error;
  }
};

export const getSpeakerById = async (id: number): Promise<Speaker | null> => {
  try {
    const results = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch speaker by ID:', error);
    throw error;
  }
};

export const getSpeakersByEventId = async (eventId: number): Promise<Speaker[]> => {
  try {
    const results = await db.select()
      .from(speakersTable)
      .innerJoin(eventSpeakersTable, eq(speakersTable.id, eventSpeakersTable.speaker_id))
      .where(eq(eventSpeakersTable.event_id, eventId))
      .execute();

    // After join, results have nested structure: { speakers: {...}, event_speakers: {...} }
    return results.map(result => result.speakers);
  } catch (error) {
    console.error('Failed to fetch speakers by event ID:', error);
    throw error;
  }
};