import { db } from '../db';
import { attendeesTable, eventsTable } from '../db/schema';
import { type CreateAttendeeInput, type Attendee } from '../schema';
import { eq } from 'drizzle-orm';

export const createAttendee = async (input: CreateAttendeeInput): Promise<Attendee> => {
  try {
    // First, check if the event exists and has available capacity
    const eventResult = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, input.event_id))
      .execute();

    if (eventResult.length === 0) {
      throw new Error(`Event with id ${input.event_id} not found`);
    }

    const event = eventResult[0];

    // Check if event is active
    if (!event.is_active) {
      throw new Error('Cannot register for an inactive event');
    }

    // Check if event has available capacity
    if (event.current_bookings >= event.max_capacity) {
      throw new Error('Event is at maximum capacity');
    }

    // Check if event has already started
    if (event.start_date <= new Date()) {
      throw new Error('Cannot register for an event that has already started');
    }

    // Insert the attendee record
    const attendeeResult = await db.insert(attendeesTable)
      .values({
        event_id: input.event_id,
        name: input.name,
        email: input.email,
        registration_status: input.registration_status
      })
      .returning()
      .execute();

    // Update the event's current_bookings count
    await db.update(eventsTable)
      .set({ 
        current_bookings: event.current_bookings + 1,
        updated_at: new Date()
      })
      .where(eq(eventsTable.id, input.event_id))
      .execute();

    const attendee = attendeeResult[0];
    return attendee;
  } catch (error) {
    console.error('Attendee creation failed:', error);
    throw error;
  }
};