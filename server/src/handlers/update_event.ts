import { db } from '../db';
import { eventsTable } from '../db/schema';
import { type UpdateEventInput, type Event } from '../schema';
import { eq } from 'drizzle-orm';

export const updateEvent = async (input: UpdateEventInput): Promise<Event> => {
  try {
    // First, check if the event exists
    const existingEvent = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, input.id))
      .execute();

    if (existingEvent.length === 0) {
      throw new Error(`Event with ID ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Partial<typeof eventsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.location !== undefined) {
      updateData.location = input.location;
    }

    if (input.start_date !== undefined) {
      updateData.start_date = input.start_date;
    }

    if (input.end_date !== undefined) {
      updateData.end_date = input.end_date;
    }

    if (input.max_capacity !== undefined) {
      updateData.max_capacity = input.max_capacity;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Validate date logic if both dates are being updated or one is being updated
    const currentEvent = existingEvent[0];
    const finalStartDate = updateData.start_date || currentEvent.start_date;
    const finalEndDate = updateData.end_date || currentEvent.end_date;

    if (finalEndDate <= finalStartDate) {
      throw new Error('End date must be after start date');
    }

    // Update the event
    const result = await db.update(eventsTable)
      .set(updateData)
      .where(eq(eventsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Event update failed:', error);
    throw error;
  }
};