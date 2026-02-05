/**
 * Error Handling Utilities
 *
 * Provides safe error message extraction to prevent '[object Object]' in error messages.
 */

/**
 * Safely extract error message from unknown error type
 *
 * @param error - Unknown error value
 * @returns Human-readable error message
 *
 * @example
 * ```typescript
 * try {
 *   throw new Error('Something went wrong');
 * } catch (error) {
 *   console.log(getErrorMessage(error)); // "Something went wrong"
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  // Fallback for other types
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
