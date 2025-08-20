import { db } from '../db';
import { speakersTable } from '../db/schema';
import { type UpdateSpeakerInput, type Speaker } from '../schema';
import { eq } from 'drizzle-orm';

export const updateSpeaker = async (input: UpdateSpeakerInput): Promise<Speaker> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof speakersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.phone !== undefined) {
      updateData.phone = input.phone;
    }
    if (input.expertise !== undefined) {
      updateData.expertise = input.expertise;
    }

    // Update speaker record
    const result = await db.update(speakersTable)
      .set(updateData)
      .where(eq(speakersTable.id, input.id))
      .returning()
      .execute();

    // Check if speaker was found and updated
    if (result.length === 0) {
      throw new Error(`Speaker with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Speaker update failed:', error);
    throw error;
  }
};