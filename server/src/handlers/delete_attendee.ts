import { db } from '../db';
import { attendeesTable, eventsTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const deleteAttendee = async (input: DeleteByIdInput): Promise<{ success: boolean }> => {
  try {
    // First, get the attendee to find the associated event
    const attendee = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, input.id))
      .execute();

    if (attendee.length === 0) {
      return { success: false };
    }

    const eventId = attendee[0].event_id;

    // Delete the attendee
    const deleteResult = await db.delete(attendeesTable)
      .where(eq(attendeesTable.id, input.id))
      .execute();

    // Update the event's current_bookings count (decrement by 1)
    await db.update(eventsTable)
      .set({ 
        current_bookings: sql`${eventsTable.current_bookings} - 1`,
        updated_at: new Date()
      })
      .where(eq(eventsTable.id, eventId))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Attendee deletion failed:', error);
    throw error;
  }
};