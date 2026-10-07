import { z } from "zod";

const objectIdSchema = z.string().uuid("Invalid id");

const createPaymentSchema = z.object({
  tripId: objectIdSchema,
});

const idParamSchema = z.object({ id: objectIdSchema });

export { createPaymentSchema, idParamSchema };