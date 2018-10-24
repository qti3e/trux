import { exit } from "deno";
export { assert, assertEqual } from "./util.ts";

export type TestFunction = () => void | Promise<void>;

const RESET = "\x1b[0m";
const FG_RED = "\x1b[31m";
const FG_GREEN = "\x1b[32m";
const xmark = `${FG_RED}✗${RESET}`;
const checkmark = `${FG_GREEN}✓${RESET}`;

const tests = new Map<string, TestFunction>();

export function test(fn: TestFunction): void {
  const name = fn.name;
  if (!name) {
    throw new Error("Test function may not be anonymous.");
  }
  if (tests.has(name)) {
    throw new Error(`Test name must be unique.\n"${name}" is already used.`);
  }
  tests.set(name, fn);
}

async function run(): Promise<never> {
  let failed = 0;

  for (const name of tests.keys()) {
    const fn = tests.get(name);
    try {
      await fn();
      console.log(`${checkmark} ${name} passed.`);
    } catch (e) {
      ++failed;
      console.log(`${xmark} ${name} failed.`);
      console.log(e);
    }
  }

  if (failed === 0) {
    exit(0);
  }

  console.log(`There were ${failed} test failures.`);
  return exit(1);
}

setTimeout(() => {
  if (tests.size) {
    run();
  }
}, 10);
