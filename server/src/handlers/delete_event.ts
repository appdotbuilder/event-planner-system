import { db } from '../db';
import { eventsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteByIdInput } from '../schema';

export const deleteEvent = async (input: DeleteByIdInput): Promise<{ success: boolean }> => {
  try {
    // Delete the event - cascade deletes will handle related records
    const result = await db.delete(eventsTable)
      .where(eq(eventsTable.id, input.id))
      .returning()
      .execute();

    // Return success status based on whether a record was deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Event deletion failed:', error);
    throw error;
  }
};