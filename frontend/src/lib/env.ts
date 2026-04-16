/**
 * Returns true when running in development mode (Next.js dev server or Tauri debug build).
 * Use this to gate dev-only UI elements — they will not appear in production builds.
 */
export const isDev = process.env.NODE_ENV === 'development';
