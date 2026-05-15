import { clsx } from 'clsx'

/**
 * Склейка классов (аналог shadcn `cn`).
 * @param {...(string | undefined | null | false)} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return clsx(inputs)
}
