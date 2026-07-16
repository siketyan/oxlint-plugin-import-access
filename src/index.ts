import { definePlugin } from "corsa-oxlint";
import { jsdocRule } from "./rules/jsdoc.js";

const plugin = definePlugin({
  rules: {
    jsdoc: jsdocRule,
  },
});

export default plugin;
export { jsdocRule };
export type { JSDocRuleOptions } from "./rules/jsdoc.js";
