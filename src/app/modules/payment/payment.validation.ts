import { z } from "zod";
import { objectIdSchema } from "../../utils/idSchema";

const createPaymentSchema = z.object({
  tripId: objectIdSchema,
});

const idParamSchema = z.object({ id: objectIdSchema });

export { createPaymentSchema, idParamSchema };