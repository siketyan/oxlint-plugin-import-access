import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

export const fixtureDir = mkdtempSync(join(tmpdir(), "corsa-import-access-"));

function write(rel: string, content: string): void {
  const full = join(fixtureDir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

export function abs(rel: string): string {
  return join(fixtureDir, rel);
}

process.once("beforeExit", () => {
  rmSync(fixtureDir, { force: true, recursive: true });
});

// ── variable ─────────────────────────────────────────────────────────────────

write(
  "variable/foo.ts",
  `/**
 * @package
 */
export const fooValue = 3;

/**
 * @access package
 */
export let fooValue2 = 2;

/**
 * @package
 */
export var { fooDestructed = 0 } = {};`,
);

write(
  "variable/sub/bar.ts",
  `/**
 * @package
 */
export const barValue = 3;

/**
 * @access package
 */
export let barValue2 = 2;

/**
 * @package
 */
export var { barDestructed = 0 } = {};`,
);

// ── function ──────────────────────────────────────────────────────────────────

write(
  "function/foo.ts",
  `/**
 * Package export
 * @package
 */
export function fooPackage() {}

/**
 * Access package export
 * @access package
 */
export function fooAccessPackage() {}`,
);

write(
  "function/sub/bar.ts",
  `/**
 * Package export
 * @package
 */
export function barPackage() {}

/**
 * Access package export
 * @access package
 */
export function barAccessPackage() {}`,
);

write(
  "function/sub/baz.ts",
  `/**
 * @package
 */
export default function bazDefault() {
  console.log("Hi");
}`,
);

// ── class ─────────────────────────────────────────────────────────────────────

write(
  "class/foo.ts",
  `/**
 * Package export
 * @package
 */
export class fooPackage {}

/**
 * Access package export
 * @access package
 */
export class fooAccessPackage {}`,
);

write(
  "class/sub/bar.ts",
  `/**
 * Package export
 * @package
 */
export class barPackage {}

/**
 * Access package export
 * @access package
 */
export class barAccessPackage {}`,
);

write(
  "class/sub/baz.ts",
  `/**
 * @package
 */
export default class {}`,
);

// ── type ──────────────────────────────────────────────────────────────────────

write(
  "type/foo.ts",
  `/**
 * Package export
 * @package
 */
export type fooType = 3;

/**
 * Access package export
 * @access package
 */
export interface fooInterface {
  (): void;
}`,
);

write(
  "type/sub/bar.ts",
  `/**
 * Package export
 * @package
 */
export type barType = {};

/**
 * Access package export
 * @access package
 */
export interface barInterface {
  foo: string;
}`,
);

// ── reexport ──────────────────────────────────────────────────────────────────

write(
  "reexport/sub/foo.ts",
  `/**
 * @package
 */
export const subFoo = "hello";`,
);

write(
  "reexport/sub/index.ts",
  `import { subFoo } from "./foo";

/**
 * @access package
 */
export { subFoo };
/**
 * @private
 */
export { subFoo as subFooPrivate };`,
);

write(
  "reexport/sub2/bar.ts",
  `/**
 * @package
 */
export const subBar = "bababa";`,
);

// No JSDoc on the re-export — access resolves to defaultImportability ("public")
write("reexport/sub2/index.ts", `export { subBar } from "./bar";`);

write(
  "reexport/sub3/bar.ts",
  `/**
 * @package
 */
export const subBaz = "bababa";`,
);

write(
  "reexport/sub3/index.ts",
  `/** @private */
export { subBaz } from "./bar";`,
);

// reexport2 — filenameLoophole tests
write(
  "reexport2/sub/foo.ts",
  `/**
 * @package
 */
export const subFoo = "hello!";`,
);

write(
  "reexport2/sub2/bar.ts",
  `/**
 * @access package
 */
export const subBar = "BAR";`,
);

// reexport3 — defaultImportability=package tests
write(
  "reexport3/sub/foo.ts",
  `/**
 * @public
 */
export const subFoo = "hello!";`,
);

write("reexport3/sub2/bar.ts", `export const subBar = "BAR";`);

// reexport4/indexLoophole
write(
  "reexport4/indexLoophole/sub/foo.ts",
  `/**
 * @package
 */
export const subFoo = "hello!";`,
);

write(
  "reexport4/indexLoophole/sub/index.ts",
  `/**
 * @package
 */
export { subFoo } from "./foo";`,
);

// reexport4/filenameLoophole
write(
  "reexport4/filenameLoophole/sub/foo.ts",
  `/**
 * @package
 */
export const subFoo = "hello!";`,
);

// ── directory-structure ───────────────────────────────────────────────────────

write(
  "directory-structure/sub/index.ts",
  `/**
 * @package
 */
export function subIndex(): void {
  console.log("subsIndex");
}`,
);

write(
  "directory-structure/sub/pkg.ts",
  `/**
 * @package
 */
export const subPackage = "I am sub package";`,
);

write(
  "directory-structure/sub/sub2/pkg.ts",
  `/**
 * @package
 */
export const subsubVar = "hello";`,
);
