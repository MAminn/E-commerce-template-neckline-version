import {
	runBackendEffect,
	serializeBackendEffectResult,
} from "#root/shared/backend/effect";
import { provideDatabase, publicProcedure } from "#root/shared/trpc/server";
import { viewProducts, viewProductsSchema } from "./service";

export const viewProductsProcedure = publicProcedure
	.input(viewProductsSchema)
	.query(async ({ ctx, input }) => {
		const safeInput =
			input.includeHidden && ctx.clientSession?.role !== "admin"
				? { ...input, includeHidden: false }
				: input;

		return await runBackendEffect(
			viewProducts(safeInput).pipe(provideDatabase(ctx)),
		).then(serializeBackendEffectResult);
	});
