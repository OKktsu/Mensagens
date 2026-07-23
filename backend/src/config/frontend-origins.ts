const defaultLocalFrontendOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

export function getAllowedFrontendOrigins() {
  const configuredFrontendOrigins = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL;

  if (!configuredFrontendOrigins) {
    return defaultLocalFrontendOrigins;
  }

  return configuredFrontendOrigins.split(",").map((origin) => origin.trim());
}
