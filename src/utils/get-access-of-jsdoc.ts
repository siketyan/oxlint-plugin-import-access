import type { Tag } from "./get-jsdoc-tags.js";
import { assertNever } from "./assert-never.js";

export type JSDocAccess = "public" | "package" | "private";

export function getAccessOfJsDocs(
  tags: readonly Tag[],
  defaultImportability: JSDocAccess,
): JSDocAccess {
  for (const tag of tags) {
    const { name } = tag;
    if (name === "package") return "package";
    if (name === "private") return "private";
    if (name === "public") return "public";
    if (name === "access") {
      const text = tag.text;
      if (text === "package") return "package";
      if (text === "private") return "private";
      if (text === "public") return "public";
    }
  }
  // If no JSDoc tags found, apply defaultImportability
  switch (defaultImportability) {
    case "public":
    case "package":
    case "private":
      return defaultImportability;
    default:
      assertNever(defaultImportability);
  }
}
