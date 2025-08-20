import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { speakersTable } from '../db/schema';
import { type UpdateSpeakerInput } from '../schema';
import { updateSpeaker } from '../handlers/update_speaker';
import { eq } from 'drizzle-orm';

describe('updateSpeaker', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test speaker directly in database
  const createTestSpeaker = async (): Promise<number> => {
    const result = await db.insert(speakersTable)
      .values({
        name: 'Original Speaker',
        bio: 'Original bio',
        email: 'original@example.com',
        phone: '555-0100',
        expertise: 'Original expertise'
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update speaker name', async () => {
    const speakerId = await createTestSpeaker();

    const updateInput: UpdateSpeakerInput = {
      id: speakerId,
      name: 'Updated Speaker Name'
    };

    const result = await updateSpeaker(updateInput);

    expect(result.id).toEqual(speakerId);
    expect(result.name).toEqual('Updated Speaker Name');
    expect(result.email).toEqual('original@example.com'); // Unchanged
    expect(result.bio).toEqual('Original bio'); // Unchanged
    expect(result.phone).toEqual('555-0100'); // Unchanged
    expect(result.expertise).toEqual('Original expertise'); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update all speaker fields', async () => {
    const speakerId = await createTestSpeaker();

    const updateInput: UpdateSpeakerInput = {
      id: speakerId,
      name: 'Completely Updated Speaker',
      bio: 'Updated bio with new information',
      email: 'updated@example.com',
      phone: '555-0200',
      expertise: 'Updated expertise in new areas'
    };

    const result = await updateSpeaker(updateInput);

    expect(result.id).toEqual(speakerId);
    expect(result.name).toEqual('Completely Updated Speaker');
    expect(result.bio).toEqual('Updated bio with new information');
    expect(result.email).toEqual('updated@example.com');
    expect(result.phone).toEqual('555-0200');
    expect(result.expertise).toEqual('Updated expertise in new areas');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields to null', async () => {
    const speakerId = await createTestSpeaker();

    const updateInput: UpdateSpeakerInput = {
      id: speakerId,
      bio: null,
      phone: null,
      expertise: null
    };

    const result = await updateSpeaker(updateInput);

    expect(result.id).toEqual(speakerId);
    expect(result.name).toEqual('Original Speaker'); // Unchanged
    expect(result.email).toEqual('original@example.com'); // Unchanged
    expect(result.bio).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.expertise).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const speakerId = await createTestSpeaker();

    const updateInput: UpdateSpeakerInput = {
      id: speakerId,
      name: 'Database Test Speaker',
      email: 'dbtest@example.com'
    };

    await updateSpeaker(updateInput);

    // Query database directly to verify changes
    const speakers = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speakerId))
      .execute();

    expect(speakers).toHaveLength(1);
    expect(speakers[0].name).toEqual('Database Test Speaker');
    expect(speakers[0].email).toEqual('dbtest@example.com');
    expect(speakers[0].bio).toEqual('Original bio'); // Unchanged
    expect(speakers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    const speakerId = await createTestSpeaker();

    // Get original timestamp
    const originalSpeakers = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, speakerId))
      .execute();
    const originalUpdatedAt = originalSpeakers[0].updated_at;

    // Wait a brief moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateSpeakerInput = {
      id: speakerId,
      name: 'Timestamp Test Speaker'
    };

    const result = await updateSpeaker(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent speaker', async () => {
    const updateInput: UpdateSpeakerInput = {
      id: 99999,
      name: 'Non-existent Speaker'
    };

    await expect(updateSpeaker(updateInput)).rejects.toThrow(/Speaker with id 99999 not found/);
  });

  it('should handle partial updates correctly', async () => {
    const speakerId = await createTestSpeaker();

    // Update only email
    const emailUpdateInput: UpdateSpeakerInput = {
      id: speakerId,
      email: 'newemail@example.com'
    };

    const emailResult = await updateSpeaker(emailUpdateInput);

    expect(emailResult.email).toEqual('newemail@example.com');
    expect(emailResult.name).toEqual('Original Speaker'); // Unchanged

    // Update only bio to null
    const bioUpdateInput: UpdateSpeakerInput = {
      id: speakerId,
      bio: null
    };

    const bioResult = await updateSpeaker(bioUpdateInput);

    expect(bioResult.bio).toBeNull();
    expect(bioResult.email).toEqual('newemail@example.com'); // From previous update
    expect(bioResult.name).toEqual('Original Speaker'); // Still unchanged
  });

  it('should handle minimal update with only required id', async () => {
    const speakerId = await createTestSpeaker();

    const updateInput: UpdateSpeakerInput = {
      id: speakerId
    };

    const result = await updateSpeaker(updateInput);

    // Should return speaker with updated timestamp but no other changes
    expect(result.id).toEqual(speakerId);
    expect(result.name).toEqual('Original Speaker');
    expect(result.bio).toEqual('Original bio');
    expect(result.email).toEqual('original@example.com');
    expect(result.phone).toEqual('555-0100');
    expect(result.expertise).toEqual('Original expertise');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});