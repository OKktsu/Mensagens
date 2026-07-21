import type { Request, Response } from "express";

import { loginUser, registerUser } from "../services/auth.service.js";

export async function register(request: Request, response: Response) {
  const { name, email, password } = request.body;
  const result = await registerUser(String(name ?? ""), String(email ?? ""), String(password ?? ""));

  return response.status(201).json(result);
}

export async function login(request: Request, response: Response) {
  const { email, password } = request.body;
  const result = await loginUser(String(email ?? ""), String(password ?? ""));

  return response.json(result);
}
