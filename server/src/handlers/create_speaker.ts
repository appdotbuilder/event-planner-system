import { db } from '../db';
import { speakersTable } from '../db/schema';
import { type CreateSpeakerInput, type Speaker } from '../schema';

export const createSpeaker = async (input: CreateSpeakerInput): Promise<Speaker> => {
  try {
    // Insert speaker record
    const result = await db.insert(speakersTable)
      .values({
        name: input.name,
        bio: input.bio,
        email: input.email,
        phone: input.phone,
        expertise: input.expertise
      })
      .returning()
      .execute();

    // Return the created speaker
    return result[0];
  } catch (error) {
    console.error('Speaker creation failed:', error);
    throw error;
  }
};