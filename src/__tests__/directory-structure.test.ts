import { RuleTester } from "corsa-oxlint/rule-tester";
import { jsdocRule } from "../rules/jsdoc.js";
import { abs } from "./fixtures.js";

const tester = new RuleTester();

tester.run("import-access/jsdoc — directory structure", jsdocRule, {
  valid: [
    {
      // subIndexUser.ts imports from ./sub/index — indexLoophole makes this valid
      filename: abs("directory-structure/subIndexUser.ts"),
      code: `import { subIndex } from "./sub/index";
console.log(subIndex);`,
    },
    {
      // parentUser.ts is inside sub/sub2/ and imports ../pkg (sub/pkg.ts) — parent dir is allowed
      filename: abs("directory-structure/sub/sub2/parentUser.ts"),
      code: `import { subPackage } from "../pkg";
console.log(subPackage);`,
    },
  ],
  invalid: [
    {
      // subsubUser.ts is at root of directory-structure/ but imports from sub/sub2/ — not allowed
      filename: abs("directory-structure/subsubUser.ts"),
      code: `import { subsubVar } from "./sub/sub2/pkg";
console.log(subsubVar);`,
      errors: [{ messageId: "package" }],
    },
    {
      // siblingUser.ts is in sub/sub3/ and imports from sub/sub2/ — sibling package, not allowed
      filename: abs("directory-structure/sub/sub3/siblingUser.ts"),
      code: `import { subsubVar } from "../sub2/pkg";
console.log(subsubVar);`,
      errors: [{ messageId: "package" }],
    },
  ],
});
