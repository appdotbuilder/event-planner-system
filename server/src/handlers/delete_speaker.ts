import { db } from '../db';
import { speakersTable, eventSpeakersTable } from '../db/schema';
import { type DeleteByIdInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteSpeaker = async (input: DeleteByIdInput): Promise<{ success: boolean }> => {
  try {
    // First verify the speaker exists
    const existingSpeaker = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, input.id))
      .execute();

    if (existingSpeaker.length === 0) {
      return { success: false };
    }

    // Delete the speaker - this will cascade delete event-speaker associations
    // due to the foreign key constraint with onDelete: 'cascade'
    const result = await db.delete(speakersTable)
      .where(eq(speakersTable.id, input.id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Speaker deletion failed:', error);
    throw error;
  }
};