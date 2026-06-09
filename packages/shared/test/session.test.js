import { describe, expect, it } from "vitest";
import { createSessionToken, sessionExpiryFromNow, verifySessionToken, } from "../src/session.js";
const SECRET = "test-session-signing-secret";
describe("session tokens", () => {
    it("creates and verifies a valid session", async () => {
        const token = await createSessionToken(SECRET, {
            sub: "customer-123",
            email: "user@example.com",
            exp: sessionExpiryFromNow(),
        });
        const result = await verifySessionToken(SECRET, token);
        expect(result.valid).toBe(true);
        if (result.valid) {
            expect(result.payload.sub).toBe("customer-123");
            expect(result.payload.email).toBe("user@example.com");
        }
    });
    it("rejects tampered tokens", async () => {
        const token = await createSessionToken(SECRET, {
            sub: "customer-123",
            email: "user@example.com",
            exp: sessionExpiryFromNow(),
        });
        const tampered = `${token}x`;
        const result = await verifySessionToken(SECRET, tampered);
        expect(result.valid).toBe(false);
    });
    it("rejects expired sessions", async () => {
        const token = await createSessionToken(SECRET, {
            sub: "customer-123",
            email: "user@example.com",
            exp: Date.now() - 1_000,
        });
        const result = await verifySessionToken(SECRET, token);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.reason).toBe("Session expired");
        }
    });
    it("rejects tokens signed with a different secret", async () => {
        const token = await createSessionToken(SECRET, {
            sub: "customer-123",
            email: "user@example.com",
            exp: sessionExpiryFromNow(),
        });
        const result = await verifySessionToken("other-secret", token);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.reason).toBe("Invalid session signature");
        }
    });
});
