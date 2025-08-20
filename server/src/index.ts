import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createEventInputSchema,
  updateEventInputSchema,
  deleteByIdInputSchema,
  createAttendeeInputSchema,
  updateAttendeeInputSchema,
  createSpeakerInputSchema,
  updateSpeakerInputSchema,
  assignSpeakerInputSchema,
  sendInvitationInputSchema
} from './schema';

// Import handlers
// Event handlers
import { createEvent } from './handlers/create_event';
import { getEvents, getEventById } from './handlers/get_events';
import { updateEvent } from './handlers/update_event';
import { deleteEvent } from './handlers/delete_event';

// Attendee handlers
import { createAttendee } from './handlers/create_attendee';
import { getAttendeesByEventId, getAllAttendees } from './handlers/get_attendees';
import { updateAttendee } from './handlers/update_attendee';
import { deleteAttendee } from './handlers/delete_attendee';

// Speaker handlers
import { createSpeaker } from './handlers/create_speaker';
import { getSpeakers, getSpeakerById, getSpeakersByEventId } from './handlers/get_speakers';
import { updateSpeaker } from './handlers/update_speaker';
import { deleteSpeaker } from './handlers/delete_speaker';

// Event-Speaker association handlers
import { assignSpeakerToEvent, unassignSpeakerFromEvent } from './handlers/assign_speaker';

// Non-functional invitation handler
import { sendInvitation } from './handlers/send_invitation';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Event management procedures
  createEvent: publicProcedure
    .input(createEventInputSchema)
    .mutation(({ input }) => createEvent(input)),
  
  getEvents: publicProcedure
    .query(() => getEvents()),
  
  getEventById: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getEventById(input.id)),
  
  updateEvent: publicProcedure
    .input(updateEventInputSchema)
    .mutation(({ input }) => updateEvent(input)),
  
  deleteEvent: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteEvent(input)),

  // Attendee management procedures
  createAttendee: publicProcedure
    .input(createAttendeeInputSchema)
    .mutation(({ input }) => createAttendee(input)),
  
  getAttendeesByEventId: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getAttendeesByEventId(input.id)),
  
  getAllAttendees: publicProcedure
    .query(() => getAllAttendees()),
  
  updateAttendee: publicProcedure
    .input(updateAttendeeInputSchema)
    .mutation(({ input }) => updateAttendee(input)),
  
  deleteAttendee: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteAttendee(input)),

  // Speaker management procedures
  createSpeaker: publicProcedure
    .input(createSpeakerInputSchema)
    .mutation(({ input }) => createSpeaker(input)),
  
  getSpeakers: publicProcedure
    .query(() => getSpeakers()),
  
  getSpeakerById: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getSpeakerById(input.id)),
  
  getSpeakersByEventId: publicProcedure
    .input(deleteByIdInputSchema)
    .query(({ input }) => getSpeakersByEventId(input.id)),
  
  updateSpeaker: publicProcedure
    .input(updateSpeakerInputSchema)
    .mutation(({ input }) => updateSpeaker(input)),
  
  deleteSpeaker: publicProcedure
    .input(deleteByIdInputSchema)
    .mutation(({ input }) => deleteSpeaker(input)),

  // Event-Speaker association procedures
  assignSpeakerToEvent: publicProcedure
    .input(assignSpeakerInputSchema)
    .mutation(({ input }) => assignSpeakerToEvent(input)),
  
  unassignSpeakerFromEvent: publicProcedure
    .input(assignSpeakerInputSchema)
    .mutation(({ input }) => unassignSpeakerFromEvent(input)),

  // Non-functional invitation procedure
  sendInvitation: publicProcedure
    .input(sendInvitationInputSchema)
    .mutation(({ input }) => sendInvitation(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();