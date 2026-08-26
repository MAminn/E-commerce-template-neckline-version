import { Redacted } from "effect";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { runBackendEffect } from "../backend/effect";
import {
  type EmailServiceInterface,
  makeEmailService,
  createDummyEmailService,
} from "./service";
import fp from "fastify-plugin";
import { ServerError } from "../error/server";

declare module "fastify" {
  export interface FastifyRequest {
    emailService: EmailServiceInterface;
  }
}

const smtpVariablesSchema = z.object({
  smtpHost: z.string(),
  smtpPort: z.number(),
  smtpUser: z.string(),
  smtpPassword: z.string(),
});

// Type for timeout result to ensure proper typing
interface TimeoutResult {
  success: false;
  error: string;
}

// Type for the email service result to help TypeScript understand our code
type MakeEmailServiceResult =
  | { success: true; result: EmailServiceInterface }
  | { success: false; error: unknown };

export const emailServiceMiddleware = fp(async (app: FastifyInstance) => {
  try {
    app.log.info("Initializing email service middleware");

    // Check if we have all required SMTP env variables
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_PORT ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASSWORD
    ) {
      app.log.warn("Missing SMTP configuration environment variables");
      app.decorateRequest("emailService", {
        getter() {
          return createDummyEmailService(app.log);
        },
      });
      return;
    }

    // Validate SMTP configuration
    const validationResult = smtpVariablesSchema.safeParse({
      smtpHost: process.env.SMTP_HOST,
      smtpPort: Number(process.env.SMTP_PORT),
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
    });

    if (!validationResult.success) {
      app.log.error({
        msg: "Invalid SMTP configuration",
        errors: validationResult.error.format(),
      });

      app.decorateRequest("emailService", {
        getter() {
          return createDummyEmailService(app.log);
        },
      });
      return;
    }

    // Log sanitized config for debugging
    app.log.info({
      msg: "Setting up email service with configuration",
      host: validationResult.data.smtpHost,
      port: validationResult.data.smtpPort,
      user: validationResult.data.smtpUser,
    });

    const data = {
      ...validationResult.data,
      smtpPassword: Redacted.make(validationResult.data.smtpPassword),
    };

    try {
      // Set a short timeout for email service creation to avoid hanging
      const timeoutPromise = new Promise<TimeoutResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            error: "Email service initialization timed out after 5 seconds",
          });
        }, 5000);
      });

      // Try to create the email service with a timeout
      // Use a try-catch to handle any potential errors from runBackendEffect
      let makeEmailServicePromise: Promise<MakeEmailServiceResult>;
      try {
        // @ts-ignore - Ignoring the type error here since we know the structure
        makeEmailServicePromise = runBackendEffect(makeEmailService(data));
      } catch (err) {
        app.log.error({
          msg: "Error running makeEmailService effect",
          error: err,
        });
        // If the effect throws, return dummy service
        app.decorateRequest("emailService", {
          getter() {
            return createDummyEmailService(app.log);
          },
        });
        return;
      }

      // Race between timeout and actual service creation
      const makeEmailServiceResult = (await Promise.race([
        makeEmailServicePromise,
        timeoutPromise,
      ])) as MakeEmailServiceResult | TimeoutResult;

      // Always use a failsafe approach - if anything goes wrong, use dummy service
      let emailService: EmailServiceInterface;

      if (
        "success" in makeEmailServiceResult &&
        makeEmailServiceResult.success
      ) {
        emailService = makeEmailServiceResult.result;
        app.log.info("Email service initialized successfully");
      } else {
        app.log.warn({
          msg: "Using dummy email service due to initialization failure",
          error:
            "error" in makeEmailServiceResult
              ? makeEmailServiceResult.error
              : "Unknown error",
        });
        emailService = createDummyEmailService(app.log);
      }

      app.decorateRequest("emailService", {
        getter() {
          return emailService;
        },
      });

      app.log.info("Email service middleware initialization complete");
    } catch (innerError) {
      app.log.error({
        msg: "Error in email service initialization",
        error: innerError,
      });
      app.decorateRequest("emailService", {
        getter() {
          return createDummyEmailService(app.log);
        },
      });
    }
  } catch (error) {
    app.log.error({
      msg: "Unexpected error in email service middleware",
      error,
    });

    app.decorateRequest("emailService", {
      getter() {
        return createDummyEmailService(app.log);
      },
    });
  }
});
