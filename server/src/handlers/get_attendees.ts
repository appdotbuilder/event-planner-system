import { db } from '../db';
import { attendeesTable } from '../db/schema';
import { type Attendee } from '../schema';
import { eq } from 'drizzle-orm';

export const getAttendeesByEventId = async (eventId: number): Promise<Attendee[]> => {
  try {
    const results = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.event_id, eventId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get attendees by event ID:', error);
    throw error;
  }
};

export const getAllAttendees = async (): Promise<Attendee[]> => {
  try {
    const results = await db.select()
      .from(attendeesTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get all attendees:', error);
    throw error;
  }
};