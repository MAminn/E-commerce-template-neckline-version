import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
export function createContext({ req }: CreateFastifyContextOptions) {
  const db = req.db;
  return {
    db,
    clientSession: req.clientSession,
    emailService: req.emailService,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
