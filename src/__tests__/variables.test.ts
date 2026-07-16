import { RuleTester } from "corsa-oxlint/rule-tester";
import { jsdocRule } from "../rules/jsdoc.js";
import { abs } from "./fixtures.js";

const tester = new RuleTester();

tester.run("import-access/jsdoc", jsdocRule, {
  valid: [
    {
      filename: abs("variable/fooUser.ts"),
      code: `import { fooDestructed, fooValue, fooValue2 } from "./foo";
console.log(fooValue, fooValue2, fooDestructed);`,
    },
  ],
  invalid: [
    {
      filename: abs("variable/barUser.ts"),
      code: `import { barDestructed, barValue, barValue2 } from "./sub/bar";
console.log(barValue, barValue2, barDestructed);`,
      errors: [
        { messageId: "package" },
        { messageId: "package" },
        { messageId: "package" },
      ],
    },
  ],
});
