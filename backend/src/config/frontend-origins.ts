const defaultLocalFrontendOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

function normalizeFrontendOrigin(origin: string) {
  const originWithoutWrappingQuotes = origin.trim().replace(/^["']|["']$/g, "");

  try {
    return new URL(originWithoutWrappingQuotes).origin;
  } catch {
    return originWithoutWrappingQuotes.replace(/\/$/, "");
  }
}

export function getAllowedFrontendOrigins() {
  const configuredFrontendOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL;

  if (!configuredFrontendOrigins) {
    return defaultLocalFrontendOrigins;
  }

  return configuredFrontendOrigins
    .split(",")
    .map(normalizeFrontendOrigin)
    .filter(Boolean);
}

export function isFrontendOriginAllowed(origin: string) {
  const normalizedOrigin = normalizeFrontendOrigin(origin);

  if (getAllowedFrontendOrigins().includes(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);

    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
