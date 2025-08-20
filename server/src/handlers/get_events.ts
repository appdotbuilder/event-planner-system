import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type Event } from '../schema';
import { eq } from 'drizzle-orm';

export const getEvents = async (): Promise<Event[]> => {
  try {
    const results = await db.select()
      .from(eventsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
};

export const getEventById = async (id: number): Promise<Event | null> => {
  try {
    const results = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Failed to fetch event by ID:', error);
    throw error;
  }
};