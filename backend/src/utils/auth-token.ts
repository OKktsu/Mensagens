import jwt from "jsonwebtoken";

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET nao foi configurado.");
  }

  return jwtSecret;
}

export function signAuthToken(userId: string) {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret());
}
