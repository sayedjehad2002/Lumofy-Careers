import { describe, expect, it } from "vitest";
import {
  contactPatch, emailFromText, findContacts, linkedinFromText, phoneFromText,
  repairGluedName, stripNameTail,
} from "@/lib/cvContacts";

describe("emailFromText", () => {
  it("reads common providers", () => {
    expect(emailFromText("Jane Doe | jane.doe@gmail.com | Manama")).toBe("jane.doe@gmail.com");
    expect(emailFromText("Email: J.Doe@Outlook.com")).toBe("j.doe@outlook.com");
    expect(emailFromText("x_y@hotmail.co.uk")).toBe("x_y@hotmail.co.uk");
    expect(emailFromText("a@polytechnic.bh")).toBe("a@polytechnic.bh");
  });

  it("cuts an address fused to the next CamelCase word", () => {
    expect(emailFromText("jane@gmail.comGitHub github.com/jane")).toBe("jane@gmail.com");
  });

  it("cuts an address fused to a following URL or after a known provider", () => {
    expect(emailFromText("0443 jane66@gmail.comhttps://github.com/jane")).toBe("jane66@gmail.com");
    expect(emailFromText("jane@outlook.comlinkedin")).toBe("jane@outlook.com");
  });

  it("refuses a cut that would truncate a longer word", () => {
    expect(emailFromText("ops@site.company")).toBeNull();
  });

  it("takes the first address (the candidate's), not a referee's further down", () => {
    expect(emailFromText("me@gmail.com ... References: boss@company.com")).toBe("me@gmail.com");
  });

  it("skips role mailboxes and does not treat '@ Company' headlines as email", () => {
    expect(emailFromText("noreply@company.com then me@gmail.com")).toBe("me@gmail.com");
    expect(emailFromText("Senior Engineer @ Lumofy | Manama")).toBeNull();
  });
});

describe("phoneFromText", () => {
  it("reads international numbers", () => {
    expect(phoneFromText("Mobile +973 3333 4444 Email")).toBe("+973 3333 4444");
    expect(phoneFromText("00966 50 123 4567")).toBe("00966 50 123 4567");
  });

  it("reads a local number only next to a phone label", () => {
    expect(phoneFromText("Phone: 3333 4444")).toBe("3333 4444");
    expect(phoneFromText("Worked 2019 2023 on 12345678 projects")).toBeNull();
  });

  it("cleans text-layer debris around the country code", () => {
    expect(findContacts("x", ["tel:973+ 33334444"]).phone).toBe("+973 33334444");
    expect(phoneFromText("Mobile: +973) 333344445")).toBe("+973 333344445");
  });

  it("rejects too-short numbers", () => {
    expect(phoneFromText("+973 12")).toBeNull();
  });
});

describe("linkedinFromText", () => {
  it("rejoins a LinkedIn-export URL wrapped across lines", () => {
    expect(linkedinFromText("Contact www.linkedin.com/in/jane- doe-431a88193 (LinkedIn) Top Skills"))
      .toBe("https://www.linkedin.com/in/jane-doe-431a88193");
  });

  it("reads a plain profile URL", () => {
    expect(linkedinFromText("linkedin.com/in/janedoe | github"))
      .toBe("https://www.linkedin.com/in/janedoe");
  });
});

describe("findContacts", () => {
  it("prefers the clickable link over the text layer", () => {
    const found = findContacts("Contact me", [
      "mailto:Jane@Gmail.com",
      "tel:+97333334444",
      "https://www.linkedin.com/in/jane-doe-123/",
    ]);
    expect(found).toEqual({
      email: "jane@gmail.com",
      phone: "+97333334444",
      linkedin: "https://www.linkedin.com/in/jane-doe-123",
    });
  });

  it("returns nulls when the CV prints nothing", () => {
    expect(findContacts("Summary Experienced analyst with a passion for data")).toEqual({
      email: null, phone: null, linkedin: null,
    });
  });
});

describe("contactPatch", () => {
  it("fills empty fields only, never overwriting what HR has on file", () => {
    expect(contactPatch(
      { email: "", phone: "+973 1111 2222", linkedin: null },
      { email: "a@gmail.com", phone: "+973 3333 4444", linkedin: "https://www.linkedin.com/in/a" },
    )).toEqual({ email: "a@gmail.com", linkedin: "https://www.linkedin.com/in/a" });
  });
});

describe("names", () => {
  it("strips a LinkedIn hex id or our company name off the end", () => {
    expect(stripNameTail("Hossam El Deen Farag 65b3818a")).toBe("Hossam El Deen Farag");
    expect(stripNameTail("M Umair Lumofy")).toBe("M Umair");
    expect(stripNameTail("Ahmed Deeb")).toBe("Ahmed Deeb"); // "deeb" is hex letters, but has no digit
    expect(stripNameTail("Lumofy")).toBe("Lumofy");
  });

  it("splits a glued name only when the CV prints those exact words", () => {
    expect(repairGluedName("Sarahshaikh", "SARAH SHAIKH Accounting student")).toBe("Sarah Shaikh");
    expect(repairGluedName("Mohamedhasanats", "Contact Mohamed Hasan Ats Manama")).toBe("Mohamed Hasan Ats");
    expect(repairGluedName("Sarahshaikh", "Sara Sheikh, accountant")).toBeNull();
    expect(repairGluedName("Abdulrahman", "Abdulrahman Ali")).toBeNull(); // one real word, nothing to split
    expect(repairGluedName("Sarah Shaikh", "Sarah Shaikh")).toBeNull();
    expect(repairGluedName("Trochinskaiadaria", "DARIA TROCHINSKAIA Product Manager")).toBe("Daria Trochinskaia");
  });
});
