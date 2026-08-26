import { Context, Effect, Redacted } from "effect";
import { ServerError } from "../error/server";
import { createTransport } from "nodemailer";
import type { JSXElementConstructor, ReactElement } from "react";
import { render } from "@react-email/components";
import type { FastifyBaseLogger } from "fastify";

export interface EmailServiceInterface {
  sendEmail(
    to: string,
    subject: string,
    body: string
  ): Effect.Effect<void, ServerError<string>, never>;
}

export class EmailService extends Context.Tag("EmailService")<
  EmailService,
  EmailServiceInterface
>() {}

export const makeEmailService = (input: {
  smtpHost: string;
  smtpUser: string;
  smtpPassword: Redacted.Redacted<string>;
  smtpPort: number;
}) =>
  Effect.gen(function* ($) {
    // Validate SMTP host - remove any http:// or https:// prefixes
    const cleanedHost = input.smtpHost.replace(/^https?:\/\//, "");

    if (cleanedHost !== input.smtpHost) {
      console.warn(
        `SMTP host contained http:// or https:// prefix which was removed. Original: ${input.smtpHost}, Cleaned: ${cleanedHost}`
      );
    }

    // Create dummy email service for fallback
    const createDummyService = () => ({
      sendEmail: (to: string, subject: string, body: string) =>
        Effect.succeed(
          void (() => {
            console.warn(
              `[DUMMY EMAIL] Not sending email to ${to}: ${subject}`
            );
            console.warn(
              "Email body would have been:",
              `${body.substring(0, 100)}...`
            );
          })()
        ) as Effect.Effect<void, ServerError<string>, never>,
    });

    try {
      // Try to create the transport but don't throw if it fails
      let transport: ReturnType<typeof createTransport> | null;
      try {
        transport = yield* $(
          Effect.try({
            try: () =>
              createTransport({
                host: cleanedHost,
                port: input.smtpPort,
                secure: true,
                auth: {
                  user: input.smtpUser,
                  pass: Redacted.value(input.smtpPassword),
                },
              }),
            catch: (err) => {
              console.warn(
                `Failed to create email transport: ${err instanceof Error ? err.message : String(err)}`
              );
              // Return null to indicate failure instead of throwing
              return null;
            },
          })
        );
      } catch (transportError) {
        console.warn("Error creating transport:", transportError);
        transport = null;
      }

      // If transport creation failed, return dummy service
      if (!transport) {
        console.warn(
          "Email transport creation failed, using dummy email service"
        );
        return createDummyService();
      }

      // Don't even attempt to verify if we know authentication will fail
      // Instead, just check if the transport exists and return the proper service
      return {
        sendEmail: (to: string, subject: string, body: string) =>
          Effect.tryPromise({
            try: async () => {
              try {
                console.log(`Attempting to send email to ${to}: ${subject}`);

                // Wrap in timeout to prevent long hanging connections
                const timeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () =>
                      reject(
                        new Error("Email sending timed out after 10 seconds")
                      ),
                    10000
                  );
                });

                // Gmail (and most clients) block base64 data URIs in email HTML.
                // Convert any embedded data URIs to CID inline attachments instead.
                const inlineAttachments: Array<{
                  filename: string;
                  content: Buffer;
                  cid: string;
                }> = [];
                let processedBody = body;
                let attachIdx = 0;
                processedBody = body.replace(
                  /src="(data:(image\/[^;]+);base64,([^"]+))"/g,
                  (_match, _dataUri, mimeType, base64Data) => {
                    const ext =
                      (mimeType as string)
                        .split("/")[1]
                        ?.replace("jpeg", "jpg") ?? "png";
                    const cid = `inline-img-${attachIdx++}`;
                    inlineAttachments.push({
                      filename: `logo.${ext}`,
                      content: Buffer.from(base64Data as string, "base64"),
                      cid,
                    });
                    return `src="cid:${cid}"`;
                  },
                );

                const sendPromise = transport.sendMail({
                  from: input.smtpUser,
                  to,
                  subject,
                  html: processedBody,
                  attachments:
                    inlineAttachments.length > 0
                      ? inlineAttachments
                      : undefined,
                });

                // Race between timeout and actual sending
                const result = await Promise.race([
                  sendPromise,
                  timeoutPromise,
                ]);
                console.log(`Email sent successfully to ${to}`);
                return result;
              } catch (error) {
                // Log but don't throw an error that stops the application
                console.error(`Failed to send email to ${to}:`, error);

                if (
                  error &&
                  typeof error === "object" &&
                  "code" in error &&
                  error.code === "EAUTH"
                ) {
                  console.warn(
                    "Authentication failed when sending email, service will be disabled"
                  );
                }

                // Convert this to a soft error that won't block the transaction
                console.warn(
                  "Email sending failed, but allowing the operation to continue"
                );
                return {
                  softError: true,
                  message: "Email failed but operation allowed to continue",
                };
              }
            },
            catch: (err) => {
              console.error(
                "Email sending error caught in Effect.tryPromise:",
                err
              );
              // Rather than throwing an error that will block the order,
              // we'll return a "successful" result but log the error
              return undefined; // This prevents the error from propagating up
            },
          }),
      };
    } catch (error) {
      console.error("Error initializing email service:", error);
      return createDummyService();
    }
  });

export const renderEmailTemplate = (
  input: ReactElement<unknown, string | JSXElementConstructor<unknown>>
) =>
  Effect.tryPromise({
    try: async () => await render(input),
    catch: (err) =>
      new ServerError({
        tag: "RenderEmailTemplateError",
        cause: err,
        message: `Failed to render email template: ${err instanceof Error ? err.message : String(err)}`,
        statusCode: 500,
        clientMessage: "Failed to generate email content",
      }),
  });

export const createDummyEmailService = (
  logger: FastifyBaseLogger
): EmailServiceInterface => {
  const sendEmail = (to: string, subject: string, body: string) => {
    logger.warn({
      msg: `[DUMMY EMAIL] Not sending email to ${to}`,
      subject,
    });
    // Return a properly typed Effect that matches EmailServiceInterface
    return Effect.succeed(undefined) as Effect.Effect<
      void,
      ServerError<string>,
      never
    >;
  };

  return { sendEmail };
};
