import { describe, expect, it } from "vitest";
import { bccMailto, bulkRejectionDraft } from "@/lib/rejectionDraft";

describe("bulkRejectionDraft", () => {
  it("names the role only when everyone applied for the same one", () => {
    const one = bulkRejectionDraft(["Account Executive", "Account Executive "]);
    expect(one.subject).toContain("Account Executive");
    expect(one.body).toContain("the Account Executive role");

    const mixed = bulkRejectionDraft(["Account Executive", "Designer"]);
    expect(mixed.subject).toBe("An update on your application at Lumofy");
    expect(mixed.body).not.toContain("Account Executive");
    expect(mixed.body).not.toContain("Designer");
  });

  it("never greets by name, because one message goes to everyone", () => {
    expect(bulkRejectionDraft(["Designer"]).body.startsWith("Hello,")).toBe(true);
  });
});

describe("bccMailto", () => {
  it("puts every address in BCC, once", () => {
    const url = bccMailto(["a@x.com", "A@x.com ", "b@x.com", ""], "Hi", "Line 1\nLine 2");
    expect(url).toBe("mailto:?bcc=a%40x.com,b%40x.com&subject=Hi&body=Line%201%0D%0ALine%202");
  });

  it("returns null with nobody to write to, or when the link would be too long to open", () => {
    expect(bccMailto([], "Hi", "Body")).toBeNull();
    const many = Array.from({ length: 120 }, (_, i) => `candidate${i}@example-mail.com`);
    expect(bccMailto(many, "Hi", "Body")).toBeNull();
  });
});
