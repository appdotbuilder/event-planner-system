import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, speakersTable, eventSpeakersTable } from '../db/schema';
import { type AssignSpeakerInput } from '../schema';
import { assignSpeakerToEvent, unassignSpeakerFromEvent } from '../handlers/assign_speaker';
import { eq, and } from 'drizzle-orm';

describe('assignSpeakerToEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testEventId: number;
  let testSpeakerId: number;

  beforeEach(async () => {
    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'A test event',
        location: 'Test Location',
        start_date: new Date('2024-12-01T10:00:00Z'),
        end_date: new Date('2024-12-01T12:00:00Z'),
        max_capacity: 100
      })
      .returning()
      .execute();
    testEventId = eventResult[0].id;

    // Create test speaker
    const speakerResult = await db.insert(speakersTable)
      .values({
        name: 'Test Speaker',
        bio: 'A test speaker',
        email: 'speaker@example.com',
        phone: '+1234567890',
        expertise: 'Testing'
      })
      .returning()
      .execute();
    testSpeakerId = speakerResult[0].id;
  });

  const testInput: AssignSpeakerInput = {
    event_id: 0, // Will be set in tests
    speaker_id: 0 // Will be set in tests
  };

  it('should assign speaker to event successfully', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const result = await assignSpeakerToEvent(input);

    // Validate returned assignment
    expect(result.id).toBeDefined();
    expect(result.event_id).toEqual(testEventId);
    expect(result.speaker_id).toEqual(testSpeakerId);
    expect(result.assigned_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const result = await assignSpeakerToEvent(input);

    // Verify assignment exists in database
    const assignments = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].event_id).toEqual(testEventId);
    expect(assignments[0].speaker_id).toEqual(testSpeakerId);
    expect(assignments[0].assigned_at).toBeInstanceOf(Date);
  });

  it('should reject assignment to non-existent event', async () => {
    const input = { ...testInput, event_id: 99999, speaker_id: testSpeakerId };
    
    await expect(assignSpeakerToEvent(input)).rejects.toThrow(/Event with id 99999 not found/);
  });

  it('should reject assignment of non-existent speaker', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: 99999 };
    
    await expect(assignSpeakerToEvent(input)).rejects.toThrow(/Speaker with id 99999 not found/);
  });

  it('should prevent duplicate assignments', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    
    // Create first assignment
    await assignSpeakerToEvent(input);
    
    // Attempt duplicate assignment
    await expect(assignSpeakerToEvent(input)).rejects.toThrow(/Speaker with id .+ is already assigned to event with id .+/);
  });

  it('should allow same speaker to be assigned to different events', async () => {
    // Create second event
    const secondEventResult = await db.insert(eventsTable)
      .values({
        title: 'Second Test Event',
        description: 'Another test event',
        location: 'Another Test Location',
        start_date: new Date('2024-12-02T10:00:00Z'),
        end_date: new Date('2024-12-02T12:00:00Z'),
        max_capacity: 50
      })
      .returning()
      .execute();

    const firstInput = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const secondInput = { ...testInput, event_id: secondEventResult[0].id, speaker_id: testSpeakerId };

    // Assign speaker to both events
    const firstAssignment = await assignSpeakerToEvent(firstInput);
    const secondAssignment = await assignSpeakerToEvent(secondInput);

    expect(firstAssignment.event_id).toEqual(testEventId);
    expect(secondAssignment.event_id).toEqual(secondEventResult[0].id);
    expect(firstAssignment.speaker_id).toEqual(testSpeakerId);
    expect(secondAssignment.speaker_id).toEqual(testSpeakerId);
  });

  it('should allow different speakers to be assigned to same event', async () => {
    // Create second speaker
    const secondSpeakerResult = await db.insert(speakersTable)
      .values({
        name: 'Second Test Speaker',
        bio: 'Another test speaker',
        email: 'speaker2@example.com',
        phone: '+0987654321',
        expertise: 'More Testing'
      })
      .returning()
      .execute();

    const firstInput = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const secondInput = { ...testInput, event_id: testEventId, speaker_id: secondSpeakerResult[0].id };

    // Assign both speakers to same event
    const firstAssignment = await assignSpeakerToEvent(firstInput);
    const secondAssignment = await assignSpeakerToEvent(secondInput);

    expect(firstAssignment.event_id).toEqual(testEventId);
    expect(secondAssignment.event_id).toEqual(testEventId);
    expect(firstAssignment.speaker_id).toEqual(testSpeakerId);
    expect(secondAssignment.speaker_id).toEqual(secondSpeakerResult[0].id);
  });
});

describe('unassignSpeakerFromEvent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testEventId: number;
  let testSpeakerId: number;
  let testAssignmentId: number;

  beforeEach(async () => {
    // Create test event
    const eventResult = await db.insert(eventsTable)
      .values({
        title: 'Test Event',
        description: 'A test event',
        location: 'Test Location',
        start_date: new Date('2024-12-01T10:00:00Z'),
        end_date: new Date('2024-12-01T12:00:00Z'),
        max_capacity: 100
      })
      .returning()
      .execute();
    testEventId = eventResult[0].id;

    // Create test speaker
    const speakerResult = await db.insert(speakersTable)
      .values({
        name: 'Test Speaker',
        bio: 'A test speaker',
        email: 'speaker@example.com',
        phone: '+1234567890',
        expertise: 'Testing'
      })
      .returning()
      .execute();
    testSpeakerId = speakerResult[0].id;

    // Create test assignment
    const assignmentResult = await db.insert(eventSpeakersTable)
      .values({
        event_id: testEventId,
        speaker_id: testSpeakerId
      })
      .returning()
      .execute();
    testAssignmentId = assignmentResult[0].id;
  });

  const testInput: AssignSpeakerInput = {
    event_id: 0, // Will be set in tests
    speaker_id: 0 // Will be set in tests
  };

  it('should unassign speaker from event successfully', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const result = await unassignSpeakerFromEvent(input);

    expect(result.success).toBe(true);
  });

  it('should remove assignment from database', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    
    // Verify assignment exists before removal
    const beforeAssignments = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.id, testAssignmentId))
      .execute();
    expect(beforeAssignments).toHaveLength(1);

    // Remove assignment
    await unassignSpeakerFromEvent(input);

    // Verify assignment no longer exists
    const afterAssignments = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.id, testAssignmentId))
      .execute();
    expect(afterAssignments).toHaveLength(0);
  });

  it('should return false success for non-existent assignment', async () => {
    const input = { ...testInput, event_id: 99999, speaker_id: 99999 };
    const result = await unassignSpeakerFromEvent(input);

    expect(result.success).toBe(false);
  });

  it('should only remove specific assignment when multiple exist', async () => {
    // Create second speaker
    const secondSpeakerResult = await db.insert(speakersTable)
      .values({
        name: 'Second Test Speaker',
        bio: 'Another test speaker',
        email: 'speaker2@example.com',
        phone: '+0987654321',
        expertise: 'More Testing'
      })
      .returning()
      .execute();

    // Create second assignment
    const secondAssignmentResult = await db.insert(eventSpeakersTable)
      .values({
        event_id: testEventId,
        speaker_id: secondSpeakerResult[0].id
      })
      .returning()
      .execute();

    // Unassign first speaker only
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    const result = await unassignSpeakerFromEvent(input);

    expect(result.success).toBe(true);

    // Verify first assignment is gone but second remains
    const firstAssignment = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.id, testAssignmentId))
      .execute();
    expect(firstAssignment).toHaveLength(0);

    const secondAssignment = await db.select()
      .from(eventSpeakersTable)
      .where(eq(eventSpeakersTable.id, secondAssignmentResult[0].id))
      .execute();
    expect(secondAssignment).toHaveLength(1);
  });

  it('should handle unassigning already unassigned speaker gracefully', async () => {
    const input = { ...testInput, event_id: testEventId, speaker_id: testSpeakerId };
    
    // Unassign speaker first time
    const firstResult = await unassignSpeakerFromEvent(input);
    expect(firstResult.success).toBe(true);

    // Try to unassign same speaker again
    const secondResult = await unassignSpeakerFromEvent(input);
    expect(secondResult.success).toBe(false);
  });
});