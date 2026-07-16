import type { CorsaNode } from "corsa-oxlint";

export type Tag = {
  name: string;
  text: string;
};

/**
 * Extracts JSDoc tags from a declaration node's leading trivia in source text.
 *
 * CorsaNode.pos follows TypeScript's convention: it includes leading trivia
 * (whitespace + comments), while CorsaNode.range[0] is the "clean" start
 * (after trivia). We look for a JSDoc block (/** ... *\/) in the trivia region
 * first, then fall back to the text immediately before pos.
 */
export function getJsDocTagsFromCorsaNode(
  sourceText: string,
  corsaNode: CorsaNode,
): Tag[] {
  const jsdocContent = extractJsDocContent(sourceText, corsaNode);
  if (!jsdocContent) return [];
  return parseJsDocTags(jsdocContent);
}

function extractJsDocContent(
  sourceText: string,
  corsaNode: CorsaNode,
): string | null {
  const { pos, range } = corsaNode;
  const cleanStart = range[0];

  // Case 1: pos includes leading trivia (TypeScript standard behavior).
  // The JSDoc lives between pos and the actual declaration start (cleanStart).
  if (cleanStart > pos) {
    const trivia = sourceText.slice(pos, cleanStart);
    const match = trivia.match(/\/\*\*([\s\S]*?)\*\//);
    if (match) return match[1];
  }

  // Case 2: pos is an inner node (VariableDeclaration, ExportSpecifier,
  // BindingElement, …) whose pos does NOT include the parent's leading trivia.
  // Find the LAST /** ... */ block in the 2000 chars before pos.
  // Guard: if the text between the end of that block and pos contains a ";"
  // the JSDoc belongs to a previous statement, not this declaration.
  const searchText = sourceText.slice(Math.max(0, pos - 2000), pos);
  const jsdocRe = /\/\*\*([\s\S]*?)\*\//g;
  let lastMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = jsdocRe.exec(searchText)) !== null) lastMatch = m;
  if (!lastMatch) return null;
  const afterJsdoc = searchText.slice(
    (lastMatch.index as number) + lastMatch[0].length,
  );
  // A semicolon between the JSDoc and pos means it belongs to a prior statement
  if (afterJsdoc.includes(";")) return null;
  return lastMatch[1];
}

function parseJsDocTags(jsdocContent: string): Tag[] {
  const tags: Tag[] = [];
  const tagRegex = /@(\w+)(?:[ \t]+([^\n@*/]+))?/g;
  let match;
  while ((match = tagRegex.exec(jsdocContent)) !== null) {
    tags.push({ name: match[1], text: (match[2] ?? "").trim() });
  }
  return tags;
}
