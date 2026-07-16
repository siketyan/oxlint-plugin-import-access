import { RuleTester } from "corsa-oxlint/rule-tester";
import { jsdocRule } from "../rules/jsdoc.js";
import { abs } from "./fixtures.js";

const tester = new RuleTester();

tester.run("import-access/jsdoc", jsdocRule, {
  valid: [
    {
      filename: abs("class/fooUser.ts"),
      code: `import { fooAccessPackage, fooPackage } from "./foo";
console.log(fooAccessPackage, fooPackage);`,
    },
  ],
  invalid: [
    {
      filename: abs("class/barUser.ts"),
      code: `import { barAccessPackage, barPackage, barPackage as renamed } from "./sub/bar";
console.log(barAccessPackage, barPackage, renamed);`,
      errors: [
        { messageId: "package" },
        { messageId: "package" },
        { messageId: "package" },
      ],
    },
    {
      filename: abs("class/bazUser.ts"),
      code: `import bazDefault from "./sub/baz";
console.log(bazDefault);`,
      errors: [{ messageId: "package" }],
    },
  ],
});
