import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { eventsTable, attendeesTable } from '../db/schema';
import { type CreateEventInput, type CreateAttendeeInput } from '../schema';
import { getAttendeesByEventId, getAllAttendees } from '../handlers/get_attendees';

// Test event data
const testEvent1: CreateEventInput = {
  title: 'Test Event 1',
  description: 'A test event',
  location: 'Test Location 1',
  start_date: new Date('2024-06-01T10:00:00Z'),
  end_date: new Date('2024-06-01T12:00:00Z'),
  max_capacity: 100
};

const testEvent2: CreateEventInput = {
  title: 'Test Event 2',
  description: 'Another test event',
  location: 'Test Location 2',
  start_date: new Date('2024-06-02T14:00:00Z'),
  end_date: new Date('2024-06-02T16:00:00Z'),
  max_capacity: 50
};

describe('get attendees handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getAttendeesByEventId', () => {
    it('should return attendees for a specific event', async () => {
      // Create test events
      const [event1, event2] = await db.insert(eventsTable)
        .values([
          {
            title: testEvent1.title,
            description: testEvent1.description,
            location: testEvent1.location,
            start_date: testEvent1.start_date,
            end_date: testEvent1.end_date,
            max_capacity: testEvent1.max_capacity
          },
          {
            title: testEvent2.title,
            description: testEvent2.description,
            location: testEvent2.location,
            start_date: testEvent2.start_date,
            end_date: testEvent2.end_date,
            max_capacity: testEvent2.max_capacity
          }
        ])
        .returning()
        .execute();

      // Create attendees for event 1
      const event1Attendees: CreateAttendeeInput[] = [
        {
          event_id: event1.id,
          name: 'John Doe',
          email: 'john@example.com',
          registration_status: 'confirmed'
        },
        {
          event_id: event1.id,
          name: 'Jane Smith',
          email: 'jane@example.com',
          registration_status: 'pending'
        }
      ];

      // Create attendees for event 2
      const event2Attendees: CreateAttendeeInput[] = [
        {
          event_id: event2.id,
          name: 'Bob Johnson',
          email: 'bob@example.com',
          registration_status: 'confirmed'
        }
      ];

      // Insert all attendees
      await db.insert(attendeesTable)
        .values([...event1Attendees, ...event2Attendees])
        .execute();

      // Test getting attendees for event 1
      const result = await getAttendeesByEventId(event1.id);

      expect(result).toHaveLength(2);
      expect(result[0].event_id).toEqual(event1.id);
      expect(result[1].event_id).toEqual(event1.id);
      
      // Check attendee details
      const attendeeNames = result.map(a => a.name).sort();
      expect(attendeeNames).toEqual(['Jane Smith', 'John Doe']);
      
      const attendeeEmails = result.map(a => a.email).sort();
      expect(attendeeEmails).toEqual(['jane@example.com', 'john@example.com']);
      
      // Check registration statuses
      const johnAttendee = result.find(a => a.name === 'John Doe');
      const janeAttendee = result.find(a => a.name === 'Jane Smith');
      expect(johnAttendee?.registration_status).toEqual('confirmed');
      expect(janeAttendee?.registration_status).toEqual('pending');
      
      // Check timestamps
      result.forEach(attendee => {
        expect(attendee.registered_at).toBeInstanceOf(Date);
        expect(attendee.updated_at).toBeInstanceOf(Date);
        expect(attendee.id).toBeDefined();
      });
    });

    it('should return empty array for event with no attendees', async () => {
      // Create an event without attendees
      const [event] = await db.insert(eventsTable)
        .values({
          title: testEvent1.title,
          description: testEvent1.description,
          location: testEvent1.location,
          start_date: testEvent1.start_date,
          end_date: testEvent1.end_date,
          max_capacity: testEvent1.max_capacity
        })
        .returning()
        .execute();

      const result = await getAttendeesByEventId(event.id);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for non-existent event', async () => {
      const result = await getAttendeesByEventId(99999);

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle different registration statuses correctly', async () => {
      // Create test event
      const [event] = await db.insert(eventsTable)
        .values({
          title: testEvent1.title,
          description: testEvent1.description,
          location: testEvent1.location,
          start_date: testEvent1.start_date,
          end_date: testEvent1.end_date,
          max_capacity: testEvent1.max_capacity
        })
        .returning()
        .execute();

      // Create attendees with different statuses
      const attendeesWithStatuses = [
        {
          event_id: event.id,
          name: 'Confirmed User',
          email: 'confirmed@example.com',
          registration_status: 'confirmed' as const
        },
        {
          event_id: event.id,
          name: 'Pending User',
          email: 'pending@example.com',
          registration_status: 'pending' as const
        },
        {
          event_id: event.id,
          name: 'Cancelled User',
          email: 'cancelled@example.com',
          registration_status: 'cancelled' as const
        }
      ];

      await db.insert(attendeesTable)
        .values(attendeesWithStatuses)
        .execute();

      const result = await getAttendeesByEventId(event.id);

      expect(result).toHaveLength(3);
      
      const statusCounts = result.reduce((acc, attendee) => {
        acc[attendee.registration_status] = (acc[attendee.registration_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(statusCounts['confirmed']).toEqual(1);
      expect(statusCounts['pending']).toEqual(1);
      expect(statusCounts['cancelled']).toEqual(1);
    });
  });

  describe('getAllAttendees', () => {
    it('should return all attendees across all events', async () => {
      // Create multiple events
      const [event1, event2] = await db.insert(eventsTable)
        .values([
          {
            title: testEvent1.title,
            description: testEvent1.description,
            location: testEvent1.location,
            start_date: testEvent1.start_date,
            end_date: testEvent1.end_date,
            max_capacity: testEvent1.max_capacity
          },
          {
            title: testEvent2.title,
            description: testEvent2.description,
            location: testEvent2.location,
            start_date: testEvent2.start_date,
            end_date: testEvent2.end_date,
            max_capacity: testEvent2.max_capacity
          }
        ])
        .returning()
        .execute();

      // Create attendees for both events
      const allAttendees = [
        {
          event_id: event1.id,
          name: 'John Doe',
          email: 'john@example.com',
          registration_status: 'confirmed' as const
        },
        {
          event_id: event1.id,
          name: 'Jane Smith',
          email: 'jane@example.com',
          registration_status: 'pending' as const
        },
        {
          event_id: event2.id,
          name: 'Bob Johnson',
          email: 'bob@example.com',
          registration_status: 'confirmed' as const
        },
        {
          event_id: event2.id,
          name: 'Alice Brown',
          email: 'alice@example.com',
          registration_status: 'cancelled' as const
        }
      ];

      await db.insert(attendeesTable)
        .values(allAttendees)
        .execute();

      const result = await getAllAttendees();

      expect(result).toHaveLength(4);
      
      // Check that attendees from both events are included
      const eventIds = [...new Set(result.map(a => a.event_id))].sort();
      expect(eventIds).toEqual([event1.id, event2.id].sort());
      
      // Check attendee names
      const attendeeNames = result.map(a => a.name).sort();
      expect(attendeeNames).toEqual(['Alice Brown', 'Bob Johnson', 'Jane Smith', 'John Doe']);
      
      // Verify all required fields are present
      result.forEach(attendee => {
        expect(attendee.id).toBeDefined();
        expect(attendee.event_id).toBeDefined();
        expect(typeof attendee.name).toBe('string');
        expect(typeof attendee.email).toBe('string');
        expect(['pending', 'confirmed', 'cancelled']).toContain(attendee.registration_status);
        expect(attendee.registered_at).toBeInstanceOf(Date);
        expect(attendee.updated_at).toBeInstanceOf(Date);
      });
    });

    it('should return empty array when no attendees exist', async () => {
      const result = await getAllAttendees();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return attendees even when events exist but have no attendees', async () => {
      // Create events but no attendees
      await db.insert(eventsTable)
        .values([
          {
            title: testEvent1.title,
            description: testEvent1.description,
            location: testEvent1.location,
            start_date: testEvent1.start_date,
            end_date: testEvent1.end_date,
            max_capacity: testEvent1.max_capacity
          },
          {
            title: testEvent2.title,
            description: testEvent2.description,
            location: testEvent2.location,
            start_date: testEvent2.start_date,
            end_date: testEvent2.end_date,
            max_capacity: testEvent2.max_capacity
          }
        ])
        .execute();

      const result = await getAllAttendees();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve chronological order of registration', async () => {
      // Create test event
      const [event] = await db.insert(eventsTable)
        .values({
          title: testEvent1.title,
          description: testEvent1.description,
          location: testEvent1.location,
          start_date: testEvent1.start_date,
          end_date: testEvent1.end_date,
          max_capacity: testEvent1.max_capacity
        })
        .returning()
        .execute();

      // Create attendees at different times (simulated by separate inserts)
      const firstAttendee = {
        event_id: event.id,
        name: 'First Attendee',
        email: 'first@example.com',
        registration_status: 'confirmed' as const
      };

      await db.insert(attendeesTable).values(firstAttendee).execute();

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const secondAttendee = {
        event_id: event.id,
        name: 'Second Attendee',
        email: 'second@example.com',
        registration_status: 'pending' as const
      };

      await db.insert(attendeesTable).values(secondAttendee).execute();

      const result = await getAllAttendees();

      expect(result).toHaveLength(2);
      
      // First attendee should have earlier timestamp
      const first = result.find(a => a.name === 'First Attendee');
      const second = result.find(a => a.name === 'Second Attendee');
      
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first!.registered_at <= second!.registered_at).toBe(true);
    });
  });
});