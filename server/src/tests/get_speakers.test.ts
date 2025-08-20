import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { speakersTable, eventsTable, eventSpeakersTable } from '../db/schema';
import { type CreateSpeakerInput, type CreateEventInput, type AssignSpeakerInput } from '../schema';
import { getSpeakers, getSpeakerById, getSpeakersByEventId } from '../handlers/get_speakers';

// Test data
const testSpeaker1: CreateSpeakerInput = {
  name: 'John Doe',
  bio: 'Experienced software developer',
  email: 'john@example.com',
  phone: '+1234567890',
  expertise: 'JavaScript, React'
};

const testSpeaker2: CreateSpeakerInput = {
  name: 'Jane Smith',
  bio: null,
  email: 'jane@example.com',
  phone: null,
  expertise: 'Python, Machine Learning'
};

const testEvent: CreateEventInput = {
  title: 'Tech Conference',
  description: 'Annual tech conference',
  location: 'Convention Center',
  start_date: new Date('2024-06-01T10:00:00Z'),
  end_date: new Date('2024-06-01T18:00:00Z'),
  max_capacity: 100
};

describe('getSpeakers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no speakers exist', async () => {
    const result = await getSpeakers();
    expect(result).toEqual([]);
  });

  it('should fetch all speakers', async () => {
    // Create test speakers
    const speakers = await db.insert(speakersTable)
      .values([testSpeaker1, testSpeaker2])
      .returning()
      .execute();

    const result = await getSpeakers();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].bio).toEqual('Experienced software developer');
    expect(result[0].email).toEqual('john@example.com');
    expect(result[0].phone).toEqual('+1234567890');
    expect(result[0].expertise).toEqual('JavaScript, React');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Jane Smith');
    expect(result[1].bio).toBeNull();
    expect(result[1].email).toEqual('jane@example.com');
    expect(result[1].phone).toBeNull();
    expect(result[1].expertise).toEqual('Python, Machine Learning');
  });
});

describe('getSpeakerById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when speaker does not exist', async () => {
    const result = await getSpeakerById(999);
    expect(result).toBeNull();
  });

  it('should fetch speaker by ID', async () => {
    // Create test speaker
    const speakers = await db.insert(speakersTable)
      .values(testSpeaker1)
      .returning()
      .execute();

    const speakerId = speakers[0].id;
    const result = await getSpeakerById(speakerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(speakerId);
    expect(result!.name).toEqual('John Doe');
    expect(result!.bio).toEqual('Experienced software developer');
    expect(result!.email).toEqual('john@example.com');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.expertise).toEqual('JavaScript, React');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should handle nullable fields correctly', async () => {
    // Create speaker with null fields
    const speakers = await db.insert(speakersTable)
      .values(testSpeaker2)
      .returning()
      .execute();

    const speakerId = speakers[0].id;
    const result = await getSpeakerById(speakerId);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Jane Smith');
    expect(result!.bio).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.email).toEqual('jane@example.com');
    expect(result!.expertise).toEqual('Python, Machine Learning');
  });
});

describe('getSpeakersByEventId', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no speakers assigned to event', async () => {
    // Create event but no speakers
    const events = await db.insert(eventsTable)
      .values(testEvent)
      .returning()
      .execute();

    const result = await getSpeakersByEventId(events[0].id);
    expect(result).toEqual([]);
  });

  it('should return empty array when event does not exist', async () => {
    const result = await getSpeakersByEventId(999);
    expect(result).toEqual([]);
  });

  it('should fetch speakers assigned to an event', async () => {
    // Create event
    const events = await db.insert(eventsTable)
      .values(testEvent)
      .returning()
      .execute();

    // Create speakers
    const speakers = await db.insert(speakersTable)
      .values([testSpeaker1, testSpeaker2])
      .returning()
      .execute();

    // Assign both speakers to the event
    await db.insert(eventSpeakersTable)
      .values([
        {
          event_id: events[0].id,
          speaker_id: speakers[0].id
        },
        {
          event_id: events[0].id,
          speaker_id: speakers[1].id
        }
      ])
      .execute();

    const result = await getSpeakersByEventId(events[0].id);

    expect(result).toHaveLength(2);
    
    // Check that both speakers are returned
    const speakerNames = result.map(s => s.name).sort();
    expect(speakerNames).toEqual(['Jane Smith', 'John Doe']);

    // Verify speaker details
    const johnSpeaker = result.find(s => s.name === 'John Doe');
    expect(johnSpeaker).toBeDefined();
    expect(johnSpeaker!.bio).toEqual('Experienced software developer');
    expect(johnSpeaker!.email).toEqual('john@example.com');

    const janeSpeaker = result.find(s => s.name === 'Jane Smith');
    expect(janeSpeaker).toBeDefined();
    expect(janeSpeaker!.bio).toBeNull();
    expect(janeSpeaker!.email).toEqual('jane@example.com');
  });

  it('should only return speakers assigned to specified event', async () => {
    // Create two events
    const events = await db.insert(eventsTable)
      .values([
        testEvent,
        {
          ...testEvent,
          title: 'Another Conference',
          start_date: new Date('2024-07-01T10:00:00Z'),
          end_date: new Date('2024-07-01T18:00:00Z')
        }
      ])
      .returning()
      .execute();

    // Create speakers
    const speakers = await db.insert(speakersTable)
      .values([testSpeaker1, testSpeaker2])
      .returning()
      .execute();

    // Assign first speaker to first event, second speaker to second event
    await db.insert(eventSpeakersTable)
      .values([
        {
          event_id: events[0].id,
          speaker_id: speakers[0].id
        },
        {
          event_id: events[1].id,
          speaker_id: speakers[1].id
        }
      ])
      .execute();

    // Get speakers for first event
    const result = await getSpeakersByEventId(events[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].email).toEqual('john@example.com');
  });

  it('should handle event with one speaker correctly', async () => {
    // Create event and speaker
    const events = await db.insert(eventsTable)
      .values(testEvent)
      .returning()
      .execute();

    const speakers = await db.insert(speakersTable)
      .values(testSpeaker1)
      .returning()
      .execute();

    // Assign speaker to event
    await db.insert(eventSpeakersTable)
      .values({
        event_id: events[0].id,
        speaker_id: speakers[0].id
      })
      .execute();

    const result = await getSpeakersByEventId(events[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('John Doe');
    expect(result[0].id).toEqual(speakers[0].id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});