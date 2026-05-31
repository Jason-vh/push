export const appUrl =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const rpName = "Push Padel";
export const rpID = new URL(appUrl).hostname;
export const expectedOrigin = appUrl;
export const isSecureCookie = appUrl.startsWith("https://");
