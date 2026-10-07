import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "src/server.ts",
  },
  format: ["esm"],
  outDir: "dist",
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,
  minify: false,
  external: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "stripe",
    "express",
    "express-rate-limit",
    "helmet",
    "cors",
    "cookie-parser",
    "jsonwebtoken",
    "bcryptjs",
    "zod",
    "http-status",
    "dotenv",
  ],
  banner: {
    js: "import { createRequire as _tsupCreateRequire } from 'node:module'; const require = _tsupCreateRequire(import.meta.url);",
  },
});