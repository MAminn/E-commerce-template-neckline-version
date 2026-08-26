import { t } from "#root/shared/trpc/server";
import { createOrderProcedure } from "./create-order/trpc";
import { deleteOrderProcedure } from "./delete-order/trpc";
import { orderStatsProcedure } from "./order-stats/trpc";
import { updateOrderStatusProcedure } from "./update-order-status/trpc";
import { viewOrdersProcedure } from "./view-orders/trpc";
import { bostaRouter } from "./bosta/trpc";

export const orderRouter = t.router({
  view: viewOrdersProcedure,
  create: createOrderProcedure,
  updateStatus: updateOrderStatusProcedure,
  stats: orderStatsProcedure,
  delete: deleteOrderProcedure,
  bosta: bostaRouter,
});
