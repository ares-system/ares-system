import { expect, test } from "vitest";

import {
  parseFirstTurn,
  referenceIndicatesVulnerable,
} from "./src/parse-dataset-text.js";

test("parseFirstTurn extracts first QA pair", () => {
  const text =
    "<s> [INST] Hello? ```code```. [/INST] No, safe. </s><s> [INST] Second [/INST] Yes. </s>";
  const p = parseFirstTurn(text);
  expect(p).not.toBeNull();
  expect(p!.query).toContain("Hello?");
  expect(p!.referenceAnswer).toContain("No, safe");
});

test("referenceIndicatesVulnerable matches dataset style", () => {
  expect(
    referenceIndicatesVulnerable("No, it does not contain any vulnerabilities."),
  ).toBe(false);
  expect(
    referenceIndicatesVulnerable(
      "Yes, it contains a vulnerability. It is classified as Integer Flow",
    ),
  ).toBe(true);
});
