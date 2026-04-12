import { expect, test } from "vitest";

import {
  textAgreesSafeReference,
  textAgreesVulnerableReference,
} from "./src/eval-agreement.js";

test("vulnerable ref: Yes prefix", () => {
  expect(
    textAgreesVulnerableReference(
      "Yes, it contains a vulnerability related to integer overflow.",
    ),
  ).toBe(true);
});

test("vulnerable ref: No prefix but describes vulnerability (model quirk)", () => {
  const sample =
    "No.\n\nThe contract contains a **division by zero vulnerability** on this line:\n```rust\nx\n```";
  expect(textAgreesVulnerableReference(sample)).toBe(true);
});

test("vulnerable ref: HF-style reference answer", () => {
  expect(
    textAgreesVulnerableReference(
      "Yes, it contains a vulnerability. It is classified as Integer Flow",
    ),
  ).toBe(true);
});

test("safe ref: denial", () => {
  expect(
    textAgreesSafeReference("No, it does not contain any vulnerabilities."),
  ).toBe(true);
});

test("safe ref: denial with 'security' before vulnerabilities (common model phrasing)", () => {
  const prose =
    "No.\n\nThis Rust smart contract snippet does not contain any security vulnerabilities. It's a simple data structure.";
  expect(textAgreesVulnerableReference(prose)).toBe(false);
  expect(textAgreesSafeReference(prose)).toBe(true);
});

test("safe ref: No without vuln claim", () => {
  expect(textAgreesSafeReference("No.\n\nThe snippet looks fine.")).toBe(true);
});

test("safe ref: fails when model affirms vulnerability", () => {
  expect(
    textAgreesSafeReference(
      "No.\n\nActually there is a reentrancy vulnerability in ...",
    ),
  ).toBe(false);
});
