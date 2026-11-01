export const appUrl =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const rpName = "Push Padel";
export const rpID = new URL(appUrl).hostname;
export const expectedOrigin = appUrl;
export const isSecureCookie = appUrl.startsWith("https://");
export const appTimeZone = "Europe/Amsterdam";
export const inviteSender = { name: rpName, email: "push@vhtm.eu" };
// Fastmail over JMAP through an exe.dev integration, which adds the token; unset, invites are only logged.
export const fastmailBaseUrl = process.env.FASTMAIL_BASE_URL;
