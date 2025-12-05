/**
 * Application-wide constants
 */

// Rate limiting constants
export const RATE_LIMIT = {
  ADMIN_LOGIN: {
    LIMIT: 5,
    WINDOW_MS: 60_000, // 1 minute
    THROTTLE_AFTER: 3,
    THROTTLE_DELAY_MS: 400,
  },
  ADMIN_ALBUMS: {
    LIMIT: 50,
    WINDOW_MS: 10 * 60 * 1000, // 10 minutes
    THROTTLE_AFTER: 25,
    THROTTLE_DELAY_MS: 200,
  },
} as const;

// Session constants
export const SESSION = {
  DEFAULT_MAX_AGE_SECONDS: 1800, // 30 minutes
  COOKIE_NAME: "admin_session_token",
} as const;

// Validation constants
export const VALIDATION = {
  MIN_RELEASE_YEAR: 1900,
  MAX_TRACK_DURATION_SECONDS: 7200, // 2 hours
  MAX_STRING_LENGTH: 255,
} as const;

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  AUDIO: 40 * 1024 * 1024, // 40 MB
} as const;

// Local media whitelists
export const LOCAL_MEDIA_PATHS = {
  AUDIO: "/audio/albums/",
  IMAGES: "/images/albums/",
} as const;
