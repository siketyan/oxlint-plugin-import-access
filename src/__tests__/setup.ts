import { afterAll, describe, it } from "vitest";
import { RuleTester } from "corsa-oxlint/rule-tester";

RuleTester.describe = describe;
RuleTester.it = it;

// Make afterAll available to the corsa RuleTester's lifecycle cleanup detection
(globalThis as Record<string, unknown>).afterAll = afterAll;
