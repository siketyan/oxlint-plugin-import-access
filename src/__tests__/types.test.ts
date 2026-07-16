import { RuleTester } from "corsa-oxlint/rule-tester";
import { jsdocRule } from "../rules/jsdoc.js";
import { abs } from "./fixtures.js";

const tester = new RuleTester();

tester.run("import-access/jsdoc", jsdocRule, {
  valid: [
    {
      filename: abs("type/fooUser.ts"),
      code: `import { fooInterface, fooType } from "./foo";
let a: [fooType, fooInterface] | undefined;
console.log(a);`,
    },
  ],
  invalid: [
    {
      filename: abs("type/barUser.ts"),
      code: `import { barInterface, barType } from "./sub/bar";
let a: [barType, barInterface] | undefined;
console.log(a);`,
      errors: [{ messageId: "package" }, { messageId: "package" }],
    },
  ],
});
