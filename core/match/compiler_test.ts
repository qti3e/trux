import * as types from "./types.ts";
import { test, assert, assertEqual } from "../testing/test.ts";
import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";

test(function compiler_test() {
  // TODO(qti3e);
  const nodes = parsePattern("(a:p)");
  const states = compile(nodes);
});
