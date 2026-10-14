import { describe, it, expect, vi, beforeEach } from "vitest"
import { isCsrfValid, generateCsrfToken } from "@/lib/csrf"

describe("CSRF Token", () => {
  describe("generateCsrfToken", () => {
    it("returns a string", () => {
      const token = generateCsrfToken()
      expect(typeof token).toBe("string")
    })

    it("returns unique tokens", () => {
      const t1 = generateCsrfToken()
      const t2 = generateCsrfToken()
      expect(t1).not.toBe(t2)
    })

    it("returns non-empty string", () => {
      const token = generateCsrfToken()
      expect(token.length).toBeGreaterThan(0)
    })
  })

  describe("isCsrfValid", () => {
    function makeRequest(
      method: string,
      headers: Record<string, string> = {}
    ): Request {
      return new Request("http://localhost/api/test", {
        method,
        headers,
      })
    }

    // Safe methods bypass
    it("returns true for GET requests without tokens", () => {
      expect(isCsrfValid(makeRequest("GET"))).toBe(true)
    })

    it("returns true for HEAD requests", () => {
      expect(isCsrfValid(makeRequest("HEAD"))).toBe(true)
    })

    it("returns true for OPTIONS requests", () => {
      expect(isCsrfValid(makeRequest("OPTIONS"))).toBe(true)
    })

    // State-changing without tokens
    it("returns false for POST without tokens", () => {
      expect(isCsrfValid(makeRequest("POST"))).toBe(false)
    })

    it("returns false for PATCH without tokens", () => {
      expect(isCsrfValid(makeRequest("PATCH"))).toBe(false)
    })

    it("returns false for PUT without tokens", () => {
      expect(isCsrfValid(makeRequest("PUT"))).toBe(false)
    })

    it("returns false for DELETE without tokens", () => {
      expect(isCsrfValid(makeRequest("DELETE"))).toBe(false)
    })

    // Token mismatch
    it("returns false when only header token is present", () => {
      const req = makeRequest("POST", {
        "x-csrf-token": "token-abc",
      })
      expect(isCsrfValid(req)).toBe(false)
    })

    it("returns false when only cookie token is present", () => {
      const req = makeRequest("POST", {
        cookie: "csrf-token=token-abc",
      })
      expect(isCsrfValid(req)).toBe(false)
    })

    it("returns false when tokens don't match", () => {
      const req = makeRequest("POST", {
        "x-csrf-token": "token-abc",
        cookie: "csrf-token=token-xyz",
      })
      expect(isCsrfValid(req)).toBe(false)
    })

    // Token match
    it("returns true when header and cookie tokens match", () => {
      const token = generateCsrfToken()
      const req = makeRequest("POST", {
        "x-csrf-token": token,
        cookie: `csrf-token=${token}`,
      })
      expect(isCsrfValid(req)).toBe(true)
    })

    it("returns true for PATCH with matching tokens", () => {
      const token = generateCsrfToken()
      const req = makeRequest("PATCH", {
        "x-csrf-token": token,
        cookie: `csrf-token=${token}`,
      })
      expect(isCsrfValid(req)).toBe(true)
    })

    it("returns true for DELETE with matching tokens", () => {
      const token = generateCsrfToken()
      const req = makeRequest("DELETE", {
        "x-csrf-token": token,
        cookie: `csrf-token=${token}`,
      })
      expect(isCsrfValid(req)).toBe(true)
    })

    // Edge cases
    it("returns false for empty header token", () => {
      const req = makeRequest("POST", {
        "x-csrf-token": "",
        cookie: "csrf-token=abc",
      })
      expect(isCsrfValid(req)).toBe(false)
    })

    it("returns false for empty cookie value", () => {
      const req = makeRequest("POST", {
        "x-csrf-token": "abc",
        cookie: "csrf-token=",
      })
      expect(isCsrfValid(req)).toBe(false)
    })

    it("handles cookies with multiple values", () => {
      const token = generateCsrfToken()
      const req = makeRequest("POST", {
        "x-csrf-token": token,
        cookie: `session=xyz; csrf-token=${token}; other=123`,
      })
      expect(isCsrfValid(req)).toBe(true)
    })

    it("case-sensitive token comparison", () => {
      const req = makeRequest("POST", {
        "x-csrf-token": "ABC",
        cookie: "csrf-token=abc",
      })
      expect(isCsrfValid(req)).toBe(false)
    })
  })
})
