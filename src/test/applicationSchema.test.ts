import { describe, it, expect } from "vitest";
import { getApplicationFieldErrors, applicationSchema } from "@/lib/applicationSchema";

const valid = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+97312345678",
  location: "Manama, Bahrain",
  nationality: "Bahraini",
};

describe("applicationSchema / getApplicationFieldErrors", () => {
  it("returns no errors for a valid payload", () => {
    expect(getApplicationFieldErrors(valid)).toEqual({});
  });

  it("treats linkedin / portfolio / coverLetter as optional", () => {
    expect(getApplicationFieldErrors({ ...valid, linkedin: "", portfolio: "", coverLetter: "" })).toEqual({});
    expect(getApplicationFieldErrors({ ...valid, coverLetter: "I would love to join." })).toEqual({});
  });

  it("flags a missing full name", () => {
    expect(getApplicationFieldErrors({ ...valid, fullName: "" }).fullName).toBe("Full name is required");
    // whitespace-only is also empty after trim
    expect(getApplicationFieldErrors({ ...valid, fullName: "   " }).fullName).toBe("Full name is required");
  });

  it("flags an invalid or empty email", () => {
    expect(getApplicationFieldErrors({ ...valid, email: "" }).email).toBe("Valid email is required");
    expect(getApplicationFieldErrors({ ...valid, email: "not-an-email" }).email).toBe("Valid email is required");
    expect(getApplicationFieldErrors({ ...valid, email: "missing@domain" }).email).toBe("Valid email is required");
    expect(getApplicationFieldErrors({ ...valid, email: "a@b.co" }).email).toBeUndefined();
  });

  it("flags missing phone / location / nationality", () => {
    expect(getApplicationFieldErrors({ ...valid, phone: "" }).phone).toBe("Phone number is required");
    expect(getApplicationFieldErrors({ ...valid, location: "" }).location).toBe("Location is required");
    expect(getApplicationFieldErrors({ ...valid, nationality: "" }).nationality).toBe("Please select your nationality");
  });

  it("reports every invalid field at once", () => {
    const errs = getApplicationFieldErrors({ fullName: "", email: "x", phone: "", location: "", nationality: "" });
    expect(Object.keys(errs).sort()).toEqual(["email", "fullName", "location", "nationality", "phone"]);
  });

  it("safeParse succeeds and trims values", () => {
    const parsed = applicationSchema.safeParse({ ...valid, fullName: "  Grace Hopper  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fullName).toBe("Grace Hopper");
  });
});
