import { definePlugin } from "@oxlint/plugins";

import jsdocRule from "./rules/jsdoc.js";

export default definePlugin({
  rules: {
    jsdoc: jsdocRule,
  },
});
