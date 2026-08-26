import type { z } from "zod";
import type { createProductSchema } from "./create-product/service";
import { Effect } from "effect";
import { ServerError } from "#root/shared/error/server";

export const validateProductRules = (
  data: z.infer<typeof createProductSchema>
) =>
  Effect.gen(function* ($) {
    const { variants } = data;

    // Early return if variants is undefined or empty array
    if (!variants || variants.length === 0) return;

    // Check for duplicated variant names
    const variantNames = variants.map((variant) => variant.name);
    const variantNamesSet = new Set();

    for (const name of variantNames) {
      if (variantNamesSet.has(name)) {
        return yield* $(
          Effect.fail(
            new ServerError({
              tag: "DuplicatedVariantName",
              statusCode: 400,
              clientMessage: `Duplicated variant name: ${name}`,
            })
          )
        );
      }
      variantNamesSet.add(name);
    }

    // Check for duplicated variant values
    for (const variant of variants) {
      const variantValues = variant.values;

      if (variantValues.length === 0) {
        return yield* $(
          Effect.fail(
            new ServerError({
              tag: "MissingVariantValues",
              statusCode: 400,
              clientMessage: `Missing variant values for variant: ${variant.name}`,
            })
          )
        );
      }

      const variantValuesSet = new Set();

      for (const value of variantValues) {
        if (variantValuesSet.has(value)) {
          return yield* $(
            Effect.fail(
              new ServerError({
                tag: "DuplicatedVariantValue",
                statusCode: 400,
                clientMessage: `Duplicated variant value: ${value}, in variant ${variant.name}`,
              })
            )
          );
        }
        variantValuesSet.add(value);
      }
    }
  });
