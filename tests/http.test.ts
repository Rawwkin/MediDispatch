import { describe, expect, it } from "vitest";
import { AppError } from "../src/app/utils/AppError";
import { catchAsync } from "../src/app/utils/catchAsync";
import { sendResponse } from "../src/app/utils/sendResponse";

describe("AppError", () => {
  it("captures status code and message", () => {
    const e = new AppError(404, "missing");
    expect(e.statusCode).toBe(404);
    expect(e.message).toBe("missing");
    expect(e).toBeInstanceOf(Error);
  });
});

describe("catchAsync", () => {
  it("forwards errors to next()", async () => {
    const handler = catchAsync(async () => {
      throw new AppError(401, "unauthorized");
    });
    let captured: unknown = null;
    await new Promise<void>((resolve) => {
      handler({} as never, {} as never, ((err: unknown) => {
        captured = err;
        resolve();
      }) as never);
    });
    expect(captured).toBeInstanceOf(AppError);
  });
});

describe("sendResponse", () => {
  it("writes the standard envelope", () => {
    const json = (): unknown => null;
    let body: unknown = null;
    const res = {
      status(code: number) {
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    } as never;
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "ok",
      data: { foo: "bar" },
    });
    expect(json).toBeTypeOf("function");
    expect((body as { success: boolean }).success).toBe(true);
    expect((body as { data: { foo: string } }).data.foo).toBe("bar");
  });
});