import { z } from 'zod';

// Event schema
export const eventSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  max_capacity: z.number().int(),
  current_bookings: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Event = z.infer<typeof eventSchema>;

// Input schema for creating events
export const createEventInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  location: z.string().min(1, "Location is required"),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  max_capacity: z.number().int().positive("Max capacity must be positive")
}).refine(data => data.end_date > data.start_date, {
  message: "End date must be after start date",
  path: ["end_date"]
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

// Input schema for updating events
export const updateEventInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  location: z.string().min(1).optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  max_capacity: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
});

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

// Registration status enum
export const registrationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled']);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

// Attendee schema
export const attendeeSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  name: z.string(),
  email: z.string().email(),
  registration_status: registrationStatusSchema,
  registered_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Attendee = z.infer<typeof attendeeSchema>;

// Input schema for creating attendees
export const createAttendeeInputSchema = z.object({
  event_id: z.number(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  registration_status: registrationStatusSchema.default('pending')
});

export type CreateAttendeeInput = z.infer<typeof createAttendeeInputSchema>;

// Input schema for updating attendees
export const updateAttendeeInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  registration_status: registrationStatusSchema.optional()
});

export type UpdateAttendeeInput = z.infer<typeof updateAttendeeInputSchema>;

// Speaker schema
export const speakerSchema = z.object({
  id: z.number(),
  name: z.string(),
  bio: z.string().nullable(),
  email: z.string().email(),
  phone: z.string().nullable(),
  expertise: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Speaker = z.infer<typeof speakerSchema>;

// Input schema for creating speakers
export const createSpeakerInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().nullable(),
  email: z.string().email("Invalid email format"),
  phone: z.string().nullable(),
  expertise: z.string().nullable()
});

export type CreateSpeakerInput = z.infer<typeof createSpeakerInputSchema>;

// Input schema for updating speakers
export const updateSpeakerInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  bio: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  expertise: z.string().nullable().optional()
});

export type UpdateSpeakerInput = z.infer<typeof updateSpeakerInputSchema>;

// Event speaker relationship schema (many-to-many)
export const eventSpeakerSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  speaker_id: z.number(),
  assigned_at: z.coerce.date()
});

export type EventSpeaker = z.infer<typeof eventSpeakerSchema>;

// Input schema for assigning speakers to events
export const assignSpeakerInputSchema = z.object({
  event_id: z.number(),
  speaker_id: z.number()
});

export type AssignSpeakerInput = z.infer<typeof assignSpeakerInputSchema>;

// Delete input schemas
export const deleteByIdInputSchema = z.object({
  id: z.number()
});

export type DeleteByIdInput = z.infer<typeof deleteByIdInputSchema>;

// Send invitation input schema (non-functional placeholder)
export const sendInvitationInputSchema = z.object({
  attendee_id: z.number(),
  message: z.string().optional()
});

export type SendInvitationInput = z.infer<typeof sendInvitationInputSchema>;