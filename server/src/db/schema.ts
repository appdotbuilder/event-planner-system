import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Registration status enum
export const registrationStatusEnum = pgEnum('registration_status', ['pending', 'confirmed', 'cancelled']);

// Events table
export const eventsTable = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  location: text('location').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  max_capacity: integer('max_capacity').notNull(),
  current_bookings: integer('current_bookings').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Attendees table
export const attendeesTable = pgTable('attendees', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  registration_status: registrationStatusEnum('registration_status').notNull().default('pending'),
  registered_at: timestamp('registered_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Speakers table
export const speakersTable = pgTable('speakers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  bio: text('bio'), // Nullable by default
  email: text('email').notNull(),
  phone: text('phone'), // Nullable by default
  expertise: text('expertise'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Event speakers junction table (many-to-many relationship)
export const eventSpeakersTable = pgTable('event_speakers', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').notNull().references(() => eventsTable.id, { onDelete: 'cascade' }),
  speaker_id: integer('speaker_id').notNull().references(() => speakersTable.id, { onDelete: 'cascade' }),
  assigned_at: timestamp('assigned_at').defaultNow().notNull()
});

// Relations
export const eventsRelations = relations(eventsTable, ({ many }) => ({
  attendees: many(attendeesTable),
  eventSpeakers: many(eventSpeakersTable)
}));

export const attendeesRelations = relations(attendeesTable, ({ one }) => ({
  event: one(eventsTable, {
    fields: [attendeesTable.event_id],
    references: [eventsTable.id]
  })
}));

export const speakersRelations = relations(speakersTable, ({ many }) => ({
  eventSpeakers: many(eventSpeakersTable)
}));

export const eventSpeakersRelations = relations(eventSpeakersTable, ({ one }) => ({
  event: one(eventsTable, {
    fields: [eventSpeakersTable.event_id],
    references: [eventsTable.id]
  }),
  speaker: one(speakersTable, {
    fields: [eventSpeakersTable.speaker_id],
    references: [speakersTable.id]
  })
}));

// TypeScript types for the table schemas
export type Event = typeof eventsTable.$inferSelect;
export type NewEvent = typeof eventsTable.$inferInsert;
export type Attendee = typeof attendeesTable.$inferSelect;
export type NewAttendee = typeof attendeesTable.$inferInsert;
export type Speaker = typeof speakersTable.$inferSelect;
export type NewSpeaker = typeof speakersTable.$inferInsert;
export type EventSpeaker = typeof eventSpeakersTable.$inferSelect;
export type NewEventSpeaker = typeof eventSpeakersTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  events: eventsTable,
  attendees: attendeesTable,
  speakers: speakersTable,
  eventSpeakers: eventSpeakersTable
};