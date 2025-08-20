import { db } from '../db';
import { attendeesTable, eventsTable } from '../db/schema';
import { type UpdateAttendeeInput, type Attendee } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const updateAttendee = async (input: UpdateAttendeeInput): Promise<Attendee> => {
  try {
    // First, get the current attendee to check registration status changes
    const currentAttendee = await db.select()
      .from(attendeesTable)
      .where(eq(attendeesTable.id, input.id))
      .execute();

    if (currentAttendee.length === 0) {
      throw new Error(`Attendee with id ${input.id} not found`);
    }

    const existingAttendee = currentAttendee[0];
    const oldStatus = existingAttendee.registration_status;
    const newStatus = input.registration_status || oldStatus;

    // Update attendee record
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.email !== undefined) {
      updateData.email = input.email;
    }
    if (input.registration_status !== undefined) {
      updateData.registration_status = input.registration_status;
    }

    const result = await db.update(attendeesTable)
      .set(updateData)
      .where(eq(attendeesTable.id, input.id))
      .returning()
      .execute();

    // Update event booking count if registration status changed
    if (oldStatus !== newStatus) {
      await updateEventBookingCount(existingAttendee.event_id, oldStatus, newStatus);
    }

    return result[0];
  } catch (error) {
    console.error('Attendee update failed:', error);
    throw error;
  }
};

const updateEventBookingCount = async (
  eventId: number,
  oldStatus: string,
  newStatus: string
): Promise<void> => {
  let increment = 0;

  // Calculate booking count change
  if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
    increment = 1; // New confirmation
  } else if (oldStatus === 'confirmed' && newStatus !== 'confirmed') {
    increment = -1; // Lost confirmation
  }

  if (increment !== 0) {
    await db.update(eventsTable)
      .set({
        current_bookings: sql`${eventsTable.current_bookings} + ${increment}`,
        updated_at: new Date()
      })
      .where(eq(eventsTable.id, eventId))
      .execute();
  }
};