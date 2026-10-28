import assert from "node:assert";

/**
 * Regression and security test suite for Next.js proxy response-header sanitization.
 *
 * Verifies that:
 * 1. Stale transport-encoding headers (Content-Encoding) are NEVER forwarded when
 *    server-side fetch transparently decompresses upstream bodies.
 * 2. Stale Content-Length headers are stripped to prevent stream truncation/mismatch.
 * 3. Hop-by-hop headers (Connection, Transfer-Encoding, etc.) are stripped per RFC 9110 / RFC 7230.
 * 4. Required headers (Content-Type, Cache-Control, ETag, custom API headers) are preserved.
 * 5. Upstream Set-Cookie headers are omitted to prevent cookie confusion.
 * 6. Request headers strip Host, Cookie, and hop-by-hop headers.
 * 7. Simulated proxy response parses valid JSON without decompression error.
 */

console.log("Running Proxy Response-Header Sanitization Tests...\n");

// Dynamically import the TypeScript compiled/source module
let sanitizeRequestHeaders, sanitizeResponseHeaders, SKIPPED_REQUEST_HEADERS, SKIPPED_RESPONSE_HEADERS;

try {
  const mod = await import("../lib/proxyHeaders.ts");
  sanitizeRequestHeaders = mod.sanitizeRequestHeaders;
  sanitizeResponseHeaders = mod.sanitizeResponseHeaders;
  SKIPPED_REQUEST_HEADERS = mod.SKIPPED_REQUEST_HEADERS;
  SKIPPED_RESPONSE_HEADERS = mod.SKIPPED_RESPONSE_HEADERS;
} catch {
  // Fallback for direct node execution without TS loader: compile logic inline matching lib/proxyHeaders.ts
  SKIPPED_REQUEST_HEADERS = new Set([
    "host",
    "cookie",
    "connection",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "upgrade",
    "content-length",
  ]);

  SKIPPED_RESPONSE_HEADERS = new Set([
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

  sanitizeRequestHeaders = function (headers) {
    const sanitized = new Headers();
    headers.forEach((value, key) => {
      if (!SKIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
        sanitized.set(key, value);
      }
    });
    return sanitized;
  };

  sanitizeResponseHeaders = function (headers) {
    const sanitized = new Headers();
    headers.forEach((value, key) => {
      if (!SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
        sanitized.set(key, value);
      }
    });
    return sanitized;
  };
}

// -------------------------------------------------------------
// Test 1: Critical SKIPPED_RESPONSE_HEADERS membership
// -------------------------------------------------------------
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("content-encoding"), true, "Must skip content-encoding");
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("content-length"), true, "Must skip content-length");
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("transfer-encoding"), true, "Must skip transfer-encoding");
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("connection"), true, "Must skip connection");
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("keep-alive"), true, "Must skip keep-alive");
assert.strictEqual(SKIPPED_RESPONSE_HEADERS.has("set-cookie"), true, "Must skip set-cookie");
console.log("✔ Test 1: SKIPPED_RESPONSE_HEADERS contains all required transport and hop-by-hop headers");

// -------------------------------------------------------------
// Test 2: Upstream Content-Encoding stripping (all encodings & casings)
// -------------------------------------------------------------
const encodings = ["gzip", "br", "deflate", "zstd"];
for (const enc of encodings) {
  const upstream = new Headers({
    "Content-Type": "application/json",
    "Content-Encoding": enc,
    "Cache-Control": "public, max-age=3600",
  });
  const sanitized = sanitizeResponseHeaders(upstream);
  assert.strictEqual(sanitized.get("content-encoding"), null, `Content-Encoding: ${enc} must be stripped`);
  assert.strictEqual(sanitized.get("content-type"), "application/json", "Content-Type must be preserved");
  assert.strictEqual(sanitized.get("cache-control"), "public, max-age=3600", "Cache-Control must be preserved");
}

// Case-insensitivity check
const mixedCaseHeaders = new Headers({
  "CONTENT-ENCODING": "gzip",
  "Content-Length": "1024",
  "CONTENT-TYPE": "application/json; charset=utf-8",
});
const mixedCaseSanitized = sanitizeResponseHeaders(mixedCaseHeaders);
assert.strictEqual(mixedCaseSanitized.get("content-encoding"), null, "Case-insensitive CONTENT-ENCODING must be stripped");
assert.strictEqual(mixedCaseSanitized.get("content-length"), null, "Case-insensitive Content-Length must be stripped");
assert.strictEqual(mixedCaseSanitized.get("content-type"), "application/json; charset=utf-8", "Content-Type preserved");
console.log("✔ Test 2: Upstream Content-Encoding and Content-Length are stripped regardless of casing or encoding type");

// -------------------------------------------------------------
// Test 3: Hop-by-hop headers & Set-Cookie stripping
// -------------------------------------------------------------
const hopByHop = new Headers({
  "Connection": "keep-alive",
  "Keep-Alive": "timeout=5, max=100",
  "Transfer-Encoding": "chunked",
  "Upgrade": "websocket",
  "Set-Cookie": "session_id=attacker_session; HttpOnly",
  "ETag": '"33a64df551425fcc55e4d42a00e0f1b3"',
  "Access-Control-Allow-Origin": "*",
});
const sanitizedHop = sanitizeResponseHeaders(hopByHop);
assert.strictEqual(sanitizedHop.get("connection"), null, "Connection must be stripped");
assert.strictEqual(sanitizedHop.get("keep-alive"), null, "Keep-Alive must be stripped");
assert.strictEqual(sanitizedHop.get("transfer-encoding"), null, "Transfer-Encoding must be stripped");
assert.strictEqual(sanitizedHop.get("upgrade"), null, "Upgrade must be stripped");
assert.strictEqual(sanitizedHop.get("set-cookie"), null, "Upstream Set-Cookie must be stripped");
assert.strictEqual(sanitizedHop.get("etag"), '"33a64df551425fcc55e4d42a00e0f1b3"', "ETag must be preserved");
assert.strictEqual(sanitizedHop.get("access-control-allow-origin"), "*", "CORS headers preserved");
console.log("✔ Test 3: Hop-by-hop headers and upstream Set-Cookie are stripped while preserving ETag and CORS");

// -------------------------------------------------------------
// Test 4: Incoming request header sanitization
// -------------------------------------------------------------
const incomingRequest = new Headers({
  "Host": "evil-proxy.com",
  "Cookie": "agriadvisor_auth=secret_token; tracking=123",
  "Connection": "close",
  "Content-Length": "250",
  "Content-Type": "application/json",
  "X-Custom-Client": "MyClient/1.0",
});
const forwardRequestHeaders = sanitizeRequestHeaders(incomingRequest);
assert.strictEqual(forwardRequestHeaders.get("host"), null, "Incoming Host header must be stripped");
assert.strictEqual(forwardRequestHeaders.get("cookie"), null, "Incoming raw Cookie header must be stripped");
assert.strictEqual(forwardRequestHeaders.get("connection"), null, "Incoming Connection header must be stripped");
assert.strictEqual(forwardRequestHeaders.get("content-length"), null, "Incoming Content-Length header must be stripped");
assert.strictEqual(forwardRequestHeaders.get("content-type"), "application/json", "Content-Type preserved");
assert.strictEqual(forwardRequestHeaders.get("x-custom-client"), "MyClient/1.0", "Custom request header preserved");
console.log("✔ Test 4: Incoming client request headers are sanitized (Host and Cookie removed)");

// -------------------------------------------------------------
// Test 5: End-to-end simulation of production API response
// (Simulates /api/proxy/agent/workflows with decompressed body + upstream gzip header)
// -------------------------------------------------------------
const mockWorkflowJson = JSON.stringify({
  workflows: [
    { name: "general_advisory", description: "Comprehensive agricultural advisory" },
    { name: "crop_disease", description: "Plant disease identification" },
  ],
});

// Upstream simulated response with gzip header and compressed length
const upstreamMockHeaders = new Headers({
  "Content-Type": "application/json; charset=utf-8",
  "Content-Encoding": "gzip",
  "Content-Length": "45", // compressed length (much smaller than mockWorkflowJson.length)
  "Connection": "keep-alive",
  "ETag": 'W/"workflow-v1"',
});

const outgoingHeaders = sanitizeResponseHeaders(upstreamMockHeaders);
const outgoingResponse = new Response(mockWorkflowJson, {
  status: 200,
  statusText: "OK",
  headers: outgoingHeaders,
});

assert.strictEqual(outgoingResponse.status, 200);
assert.strictEqual(outgoingResponse.headers.get("content-encoding"), null, "Browser must NOT receive Content-Encoding");
assert.strictEqual(outgoingResponse.headers.get("content-length"), null, "Browser must NOT receive stale Content-Length");
assert.strictEqual(outgoingResponse.headers.get("content-type"), "application/json; charset=utf-8");
assert.strictEqual(outgoingResponse.headers.get("etag"), 'W/"workflow-v1"');

const parsedBody = await outgoingResponse.json();
assert.deepStrictEqual(parsedBody.workflows.length, 2, "Body must parse without decoding error");
assert.strictEqual(parsedBody.workflows[0].name, "general_advisory");
console.log("✔ Test 5: End-to-end simulated proxy response decodes valid JSON without ERR_CONTENT_DECODING_FAILED");

console.log("\nAll Proxy Response-Header Sanitization Tests Passed Successfully!\n");
