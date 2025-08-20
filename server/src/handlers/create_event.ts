import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type CreateEventInput, type Event } from '../schema';

export const createEvent = async (input: CreateEventInput): Promise<Event> => {
  try {
    // Insert event record
    const result = await db.insert(eventsTable)
      .values({
        title: input.title,
        description: input.description,
        location: input.location,
        start_date: input.start_date,
        end_date: input.end_date,
        max_capacity: input.max_capacity,
        current_bookings: 0, // Default value for new events
        is_active: true // Default value for new events
      })
      .returning()
      .execute();

    // Return the created event
    return result[0];
  } catch (error) {
    console.error('Event creation failed:', error);
    throw error;
  }
};