import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import config from "../config";

export type TJwtPayload = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export const jwtUtils = {
  signAccessToken(payload: TJwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    } as SignOptions);
  },

  signRefreshToken(payload: TJwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    } as SignOptions);
  },

  verifyAccess(token: string): TJwtPayload {
    return jwt.verify(token, config.jwt.accessSecret) as TJwtPayload;
  },

  verifyRefresh(token: string): TJwtPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as TJwtPayload;
  },

  tryVerifyAccess(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    } catch {
      return null;
    }
  },
};