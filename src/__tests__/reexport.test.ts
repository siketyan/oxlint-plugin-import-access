import { RuleTester } from "corsa-oxlint/rule-tester";
import { jsdocRule } from "../rules/jsdoc.js";
import { abs } from "./fixtures.js";

const tester = new RuleTester();

// useFoo imports from ./sub (re-exported with @package and @private).
// With indexLoophole=true (default), subFoo is allowed; subFooPrivate has @private → error.
// useBar imports from ./sub2 where re-export has no JSDoc → defaultImportability="public" → valid.
// useBaz imports from ./sub3 where re-export has @private → error.
tester.run("import-access/jsdoc — reexport via index", jsdocRule, {
  valid: [
    {
      filename: abs("reexport/useBar.ts"),
      code: `import { subBar } from "./sub2";
console.log(subBar);`,
    },
  ],
  invalid: [
    {
      filename: abs("reexport/useFoo.ts"),
      code: `import { subFoo, subFooPrivate } from "./sub";
console.log(subFoo, subFooPrivate);`,
      errors: [{ messageId: "private" }],
    },
    {
      filename: abs("reexport/useBaz.ts"),
      code: `import { subBaz } from "./sub3";
console.log(subBaz);`,
      errors: [{ messageId: "private" }],
    },
  ],
});

// indexLoophole=true (default): re-export from index.ts is allowed, from foo.ts is not
tester.run("import-access/jsdoc — indexLoophole=true", jsdocRule, {
  valid: [
    {
      filename: abs("reexport4/indexLoophole/reexportFromSubIndex.ts"),
      code: `export { subFoo } from "./sub/index";`,
    },
  ],
  invalid: [
    {
      filename: abs("reexport4/indexLoophole/reexportFromSubFoo.ts"),
      code: `export { subFoo } from "./sub/foo";`,
      errors: [{ messageId: "package:reexport" }],
    },
  ],
});

// indexLoophole=false: index.ts loophole is disabled
tester.run("import-access/jsdoc — indexLoophole=false", jsdocRule, {
  valid: [],
  invalid: [
    {
      filename: abs("reexport/useFoo-noIdx.ts"),
      code: `import { subFoo, subFooPrivate } from "./sub";
console.log(subFoo, subFooPrivate);`,
      options: [{ indexLoophole: false }],
      errors: [{ messageId: "package" }, { messageId: "private" }],
    },
    {
      filename: abs("reexport4/indexLoophole/reexportFromSubIndex-noIdx.ts"),
      code: `export { subFoo } from "./sub/index";`,
      options: [{ indexLoophole: false }],
      errors: [{ messageId: "package:reexport" }],
    },
  ],
});

// filenameLoophole=true: basename match allows cross-directory access
tester.run("import-access/jsdoc — filenameLoophole=true", jsdocRule, {
  valid: [
    {
      // sub.ts can import from ./sub/ because its basename matches
      filename: abs("reexport2/sub.ts"),
      code: `import { subFoo } from "./sub/foo";
console.log(subFoo);`,
      options: [{ indexLoophole: false, filenameLoophole: true }],
    },
    {
      filename: abs("reexport4/filenameLoophole/sub.ts"),
      code: `export { subFoo } from "./sub/foo";`,
      options: [{ indexLoophole: false, filenameLoophole: true }],
    },
  ],
  invalid: [
    {
      // sub.ts cannot import from ./sub2/ because basename doesn't match "sub2"
      filename: abs("reexport2/sub-crossdir.ts"),
      code: `import { subBar } from "./sub2/bar";
console.log(subBar);`,
      options: [{ indexLoophole: false, filenameLoophole: true }],
      errors: [{ messageId: "package" }],
    },
    {
      // sub2.ts cannot import from ./sub/ because basename doesn't match "sub"
      filename: abs("reexport4/filenameLoophole/sub2.ts"),
      code: `export { subFoo } from "./sub/foo";`,
      options: [{ indexLoophole: false, filenameLoophole: true }],
      errors: [{ messageId: "package:reexport" }],
    },
  ],
});

// defaultImportability=package: exports without JSDoc are treated as package-private
tester.run("import-access/jsdoc — defaultImportability=package", jsdocRule, {
  valid: [
    {
      // @public explicitly overrides defaultImportability=package
      filename: abs("reexport3/usePublic.ts"),
      code: `import { subFoo } from "./sub/foo";
console.log(subFoo);`,
      options: [{ defaultImportability: "package" }],
    },
  ],
  invalid: [
    {
      // No JSDoc on subBar → treated as package-private under defaultImportability=package
      filename: abs("reexport3/sub.ts"),
      code: `import { subFoo } from "./sub/foo";
import { subBar } from "./sub2/bar";
console.log(subFoo, subBar);`,
      options: [{ defaultImportability: "package" }],
      errors: [{ messageId: "package" }],
    },
  ],
});
