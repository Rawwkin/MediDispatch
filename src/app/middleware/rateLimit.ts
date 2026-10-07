import rateLimit, { Options } from "express-rate-limit";

const authLimiterOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
};

export const authLimiter = rateLimit(authLimiterOptions);

const globalLimiterOptions: Partial<Options> = {
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please slow down.",
  },
};

export const globalLimiter = rateLimit(globalLimiterOptions);