import { afterAll, describe, expect, it } from "vitest";

import { getOxlintTester } from "./fixtures/oxlint";

const tester = await getOxlintTester();

afterAll(async () => {
  await tester.close();
});

describe("variables", () => {
  it("Can import from same directory", async () => {
    const result = await tester.lintFile("src/variable/fooUser.ts");
    expect(result).toEqual([]);
  });
  it("Cannot import from sub directory", async () => {
    const result = await tester.lintFile("src/variable/barUser.ts");
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "column": 10,
          "endColumn": 23,
          "endLine": 1,
          "line": 1,
          "message": "Cannot import a package-private export 'barDestructed'",
          "messageId": "package",
          "ruleId": "import-access/jsdoc",
          "severity": 2,
        },
        Object {
          "column": 25,
          "endColumn": 33,
          "endLine": 1,
          "line": 1,
          "message": "Cannot import a package-private export 'barValue'",
          "messageId": "package",
          "ruleId": "import-access/jsdoc",
          "severity": 2,
        },
        Object {
          "column": 35,
          "endColumn": 44,
          "endLine": 1,
          "line": 1,
          "message": "Cannot import a package-private export 'barValue2'",
          "messageId": "package",
          "ruleId": "import-access/jsdoc",
          "severity": 2,
        },
      ]
    `);
  });
});
