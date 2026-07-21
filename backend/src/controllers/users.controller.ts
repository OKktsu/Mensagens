import type { Request, Response } from "express";

import { AppError } from "../utils/app-error.js";
import { listUsers } from "../services/users.service.js";

export async function index(request: Request, response: Response) {
  if (!request.userId) {
    throw new AppError("Usuario nao autenticado.", 401);
  }

  const users = await listUsers(request.userId);

  return response.json({
    users,
  });
}
