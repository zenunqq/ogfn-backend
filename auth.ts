import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "./config";

export interface JwtPayload {
  accountId: string;
  username: string;
  iat?: number;
  exp?: number;
}

const bcryptSaltRounds = config.BCRYPT_SALT_ROUNDS || 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptSaltRounds);
}

export function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(accountId: string, username: string): string {
  return jwt.sign({ accountId, username }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  const actualToken = token;
  const decoded = jwt.verify(actualToken, config.JWT_SECRET) as JwtPayload;

  if (!decoded.accountId) {
    const error = new Error("Invalid token payload: missing accountId");
    error.name = "TokenPayloadError";
    throw error;
  }

  return decoded;
}

export function authMiddleware(request: any, response: any, next: any): any {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      response.code(401).send({ error: "Authorization header missing" });
      return;
    }

    // Support both "bearer TOKEN" and raw "TOKEN" formats
    const token = authHeader.startsWith("bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    const decoded = verifyToken(token);
    request.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === "TokenPayloadError") {
      response.code(401).send({ error: "Invalid token payload" });
    } else {
      response.code(401).send({ error: "Invalid or expired token" });
    }
  }
}

export function optionalAuthMiddleware(request: any, response: any, next: any): any {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader) {
      // Support both "bearer TOKEN" and raw "TOKEN" formats
      const token = authHeader.startsWith("bearer ")
        ? authHeader.substring(7)
        : authHeader;

      const decoded = verifyToken(token);
      request.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without auth - optional
    next();
  }
}