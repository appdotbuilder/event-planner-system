import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { speakersTable } from '../db/schema';
import { type CreateSpeakerInput } from '../schema';
import { createSpeaker } from '../handlers/create_speaker';
import { eq } from 'drizzle-orm';

// Complete test input with all fields
const testInput: CreateSpeakerInput = {
  name: 'Dr. Jane Smith',
  bio: 'Experienced software engineer and technology speaker with over 10 years in the industry.',
  email: 'jane.smith@example.com',
  phone: '+1-555-0123',
  expertise: 'Software Architecture, Cloud Computing, AI/ML'
};

// Test input with nullable fields
const minimalInput: CreateSpeakerInput = {
  name: 'John Doe',
  bio: null,
  email: 'john.doe@example.com',
  phone: null,
  expertise: null
};

describe('createSpeaker', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a speaker with all fields', async () => {
    const result = await createSpeaker(testInput);

    // Basic field validation
    expect(result.name).toEqual('Dr. Jane Smith');
    expect(result.bio).toEqual(testInput.bio);
    expect(result.email).toEqual('jane.smith@example.com');
    expect(result.phone).toEqual('+1-555-0123');
    expect(result.expertise).toEqual('Software Architecture, Cloud Computing, AI/ML');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a speaker with minimal fields (nullable fields as null)', async () => {
    const result = await createSpeaker(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.bio).toBeNull();
    expect(result.email).toEqual('john.doe@example.com');
    expect(result.phone).toBeNull();
    expect(result.expertise).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save speaker to database', async () => {
    const result = await createSpeaker(testInput);

    // Query using proper drizzle syntax
    const speakers = await db.select()
      .from(speakersTable)
      .where(eq(speakersTable.id, result.id))
      .execute();

    expect(speakers).toHaveLength(1);
    expect(speakers[0].name).toEqual('Dr. Jane Smith');
    expect(speakers[0].bio).toEqual(testInput.bio);
    expect(speakers[0].email).toEqual('jane.smith@example.com');
    expect(speakers[0].phone).toEqual('+1-555-0123');
    expect(speakers[0].expertise).toEqual('Software Architecture, Cloud Computing, AI/ML');
    expect(speakers[0].created_at).toBeInstanceOf(Date);
    expect(speakers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate email addresses appropriately', async () => {
    // Create first speaker
    await createSpeaker(testInput);

    // Try to create second speaker with same email
    const duplicateInput: CreateSpeakerInput = {
      name: 'Different Name',
      bio: 'Different bio',
      email: 'jane.smith@example.com', // Same email
      phone: '+1-555-9999',
      expertise: 'Different expertise'
    };

    // Should succeed since email uniqueness is not enforced in schema
    const result = await createSpeaker(duplicateInput);
    expect(result.name).toEqual('Different Name');
    expect(result.email).toEqual('jane.smith@example.com');
  });

  it('should generate unique IDs for multiple speakers', async () => {
    const result1 = await createSpeaker(testInput);
    const result2 = await createSpeaker(minimalInput);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
    expect(typeof result1.id).toEqual('number');
    expect(typeof result2.id).toEqual('number');
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createSpeaker(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreate).toBe(true);
    expect(result.created_at <= afterCreate).toBe(true);
    expect(result.updated_at >= beforeCreate).toBe(true);
    expect(result.updated_at <= afterCreate).toBe(true);
  });
});