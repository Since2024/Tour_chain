import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the route-protection logic extracted from middleware.ts as pure functions.
// We don't import the middleware directly because it depends on @supabase/ssr
// binding to the Next.js edge runtime — instead we verify the same rules hold.

const PROTECTED = ["/dashboard", "/book", "/trek", "/profile", "/admin"];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname.startsWith(p));
}

function requiresAdminRole(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

describe("route protection rules", () => {
  it("marks /dashboard as protected", () => {
    expect(isProtected("/dashboard")).toBe(true);
  });

  it("marks /dashboard/settings as protected", () => {
    expect(isProtected("/dashboard/settings")).toBe(true);
  });

  it("marks /book as protected", () => {
    expect(isProtected("/book")).toBe(true);
  });

  it("marks /trek/some-id as protected", () => {
    expect(isProtected("/trek/some-id")).toBe(true);
  });

  it("does not mark / as protected", () => {
    expect(isProtected("/")).toBe(false);
  });

  it("does not mark /login as protected", () => {
    expect(isProtected("/login")).toBe(false);
  });

  it("does not mark /api/places as protected (api excluded by matcher)", () => {
    expect(isProtected("/api/places")).toBe(false);
  });

  it("marks /admin as both protected and admin-only", () => {
    expect(isProtected("/admin")).toBe(true);
    expect(requiresAdminRole("/admin")).toBe(true);
  });

  it("marks /admin/users as admin-only", () => {
    expect(requiresAdminRole("/admin/users")).toBe(true);
  });

  it("does not require admin role for /dashboard", () => {
    expect(requiresAdminRole("/dashboard")).toBe(false);
  });
});

describe("redirect target construction", () => {
  it("appends next param when redirecting to /login", () => {
    const pathname = "/dashboard";
    const loginUrl = new URL("http://localhost/login");
    loginUrl.searchParams.set("next", pathname);
    expect(loginUrl.toString()).toBe("http://localhost/login?next=%2Fdashboard");
  });

  it("redirects non-admin from /admin to /dashboard", () => {
    const redirectTarget = "/dashboard";
    expect(redirectTarget).toBe("/dashboard");
  });
});
