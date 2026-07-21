import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";

import { AppError } from "../utils/app-error.js";
import { verifyAuthToken } from "../utils/auth-token.js";

function getTokenFromRequest(request: Request) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader) {
    throw new AppError("Token nao informado.", 401);
  }

  const [type, token] = authorizationHeader.split(" ");

  if (type !== "Bearer" || !token) {
    throw new AppError("Token invalido.", 401);
  }

  return token;
}

export function authMiddleware(request: Request, _response: Response, next: NextFunction) {
  const token = getTokenFromRequest(request);
  const payload = verifyAuthToken(token) as JwtPayload;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new AppError("Token invalido.", 401);
  }

  request.userId = payload.sub;

  return next();
}
