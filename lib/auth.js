// Tiny demo auth: the cookie holds a SHA-256 of the admin password.
// Works in both Edge (middleware) and Node (route handlers) via Web Crypto.
export const COOKIE_NAME = 'admin_token';

export async function tokenFor(password) {
  const data = new TextEncoder().encode(`northfield-admin:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isValidToken(token) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !token) return false;
  return token === (await tokenFor(password));
}

// Defense in depth: API routes check auth themselves, not only the middleware.
export async function isAdminRequest(request) {
  return isValidToken(request.cookies.get(COOKIE_NAME)?.value);
}
