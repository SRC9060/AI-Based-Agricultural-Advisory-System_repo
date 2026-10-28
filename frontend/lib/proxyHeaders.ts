/**
 * Proxy header sanitization utilities for AgriAdvisor.
 *
 * Separates request and response header policies according to RFC 9110 / RFC 7230
 * and prevents upstream transport-encoding mismatch when server-side fetch()
 * automatically decompresses response payloads.
 */

/**
 * Hop-by-hop and client-specific headers that should not be forwarded to the upstream backend.
 */
export const SKIPPED_REQUEST_HEADERS = new Set([
  "host",
  "cookie",
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

/**
 * Headers from the upstream response that must NOT be forwarded to the client:
 *
 * 1. Transport & compression headers:
 *    - `content-encoding`: Node.js / Undici fetch() transparently decompresses
 *      compressed upstream bodies (gzip, deflate, br, zstd). If the upstream
 *      Content-Encoding header is forwarded with an already-decompressed body,
 *      browsers will attempt decompression on plaintext, causing ERR_CONTENT_DECODING_FAILED
 *      and 'TypeError: Failed to fetch'.
 *    - `content-length`: Decompression alters byte length; forwarding stale upstream
 *      compressed length causes premature stream truncation or decode errors.
 * 2. Hop-by-hop headers (RFC 9110 / RFC 7230):
 *    - `connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`,
 *      `proxy-connection`, `te`, `trailer`, `transfer-encoding`, `upgrade`.
 * 3. `set-cookie`:
 *    - Handled explicitly by the proxy (clearing auth cookie on 401) to prevent
 *      upstream cookie confusion.
 */
export const SKIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "set-cookie",
]);

/**
 * Filter and sanitize incoming client request headers before forwarding upstream.
 */
export function sanitizeRequestHeaders(headers: Headers): Headers {
  const sanitized = new Headers();
  headers.forEach((value, key) => {
    if (!SKIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      sanitized.set(key, value);
    }
  });
  return sanitized;
}

/**
 * Filter and sanitize upstream backend response headers before forwarding to the client.
 */
export function sanitizeResponseHeaders(headers: Headers): Headers {
  const sanitized = new Headers();
  headers.forEach((value, key) => {
    if (!SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      sanitized.set(key, value);
    }
  });
  return sanitized;
}
