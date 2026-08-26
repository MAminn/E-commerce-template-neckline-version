import { describe, it, expect } from "vitest";

describe("Existing system baseline", () => {
  it("should import the schema module without errors", async () => {
    const schema = await import("#root/shared/database/drizzle/schema.js");
    expect(schema).toBeDefined();
    expect(schema.user).toBeDefined();
    expect(schema.product).toBeDefined();
    expect(schema.order).toBeDefined();
  });

  it("should import the ServerError class", async () => {
    const { ServerError } = await import("#root/shared/error/server.js");
    expect(ServerError).toBeDefined();
    const err = new ServerError({ tag: "Test", message: "test error" });
    expect(err._tag).toBe("Test");
  });

  it("should import tRPC server utilities", async () => {
    const trpcServer = await import("#root/shared/trpc/server.js");
    expect(trpcServer.t).toBeDefined();
    expect(trpcServer.router).toBeDefined();
    expect(trpcServer.publicProcedure).toBeDefined();
    expect(trpcServer.protectedProcedure).toBeDefined();
    expect(trpcServer.adminProcedure).toBeDefined();
  });

  it("should import the app router", async () => {
    const { appRouter } = await import("#root/shared/trpc/router.js");
    expect(appRouter).toBeDefined();
  });
});
