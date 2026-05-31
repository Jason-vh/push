export const appUrl =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
export const rpName = "Push Padel";
// TEMPORARY: use the parent registrable domain so the browser finds no
// matching passkeys for push.vhtm.eu, letting us test the "no passkeys"
// prompt UX. Revert to `new URL(appUrl).hostname` afterwards.
export const rpID = "vhtm.eu";
export const expectedOrigin = appUrl;
export const isSecureCookie = appUrl.startsWith("https://");
