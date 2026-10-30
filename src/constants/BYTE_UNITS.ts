/** Binary size units, the way the server counts its limit: a kilobyte is 1024 bytes. */
export const BYTE_UNITS = {
  KILOBYTE: 1024,
  MEGABYTE: 1024 * 1024
} as const;
