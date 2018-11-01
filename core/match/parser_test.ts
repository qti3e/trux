import { test, assert, assertEqual } from "../testing/test.ts";
import { parsePattern } from "./parser.ts";
import { NodeKind } from "./common.ts";

test(function parser_emptyPattern() {
  const ret = parsePattern("") as any;
  assertEqual(ret.nodes.length, 1);
  assertEqual(ret.nodes[0].data, "");
});

test(function parser_blankParameterName() {
  let err;
  try {
    parsePattern(":2");
    err = null;
  } catch (e) {
    err = e;
  }
  assert(err);

  try {
    parsePattern(":");
    err = null;
  } catch (e) {
    err = e;
  }
  assert(err);

  try {
    parsePattern(":?");
    err = null;
  } catch (e) {
    err = e;
  }
  assert(err);
});

test(function parser_group() {
  const ret = parsePattern("a(b|c|)?d(e|f)") as any;
  assertEqual(ret.nodes.length, 4);
  assertEqual(ret.nodes[0].data, "a");
  assertEqual(ret.nodes[1].kind, NodeKind.GROUP);
  assertEqual(ret.nodes[1].isOptional, true);
  assertEqual(ret.nodes[1].expressions.length, 3);
  assertEqual(ret.nodes[1].expressions[0].nodes[0].data, "b");
  assertEqual(ret.nodes[1].expressions[1].nodes[0].data, "c");
  assertEqual(ret.nodes[1].expressions[2].nodes[0].data, "");
  assertEqual(ret.nodes[2].data, "d");
  assertEqual(ret.nodes[3].kind, NodeKind.GROUP);
  assertEqual(ret.nodes[3].expressions[0].nodes[0].data, "e");
  assertEqual(ret.nodes[3].expressions[1].nodes[0].data, "f");
  assertEqual(ret.nodes[3].isOptional, false);
});

test(function parser_nestedGroup() {
  const ret = parsePattern("a(b|(c|(d|e)?))f") as any;
  assertEqual(ret.nodes.length, 3);
  assertEqual(ret.nodes[0].data, "a");
  assertEqual(ret.nodes[1].kind, NodeKind.GROUP);
  assertEqual(ret.nodes[1].expressions.length, 2);
  assertEqual(ret.nodes[1].expressions[0].nodes.length, 1);
  assertEqual(ret.nodes[1].expressions[0].nodes[0].data, "b");
  assertEqual(ret.nodes[1].expressions[1].nodes.length, 1);
  assertEqual(ret.nodes[1].expressions[1].nodes[0].kind, NodeKind.GROUP);
  let tmp = ret.nodes[1].expressions[1].nodes[0];
  assertEqual(tmp.expressions.length, 2);
  assertEqual(tmp.expressions[0].nodes.length, 1);
  assertEqual(tmp.expressions[0].nodes[0].data, "c");
  assertEqual(tmp.expressions[1].nodes[0].kind, NodeKind.GROUP);
  assertEqual(tmp.expressions[1].nodes[0].isOptional, true);
  assertEqual(ret.nodes[2].data, "f");
});

test(function parser_escape() {
  // a\\ -> a\
  const test1 = parsePattern("a\\\\") as any;
  assertEqual(test1.nodes.length, 1);
  assertEqual(test1.nodes[0].data, "a\\");
  // a\((s)
  const test2 = parsePattern("a\\((s)") as any;
  assertEqual(test2.nodes.length, 2);
  assertEqual(test2.nodes[0].data, "a(");
  assertEqual(test2.nodes[1].kind, NodeKind.GROUP);
  const test3 = parsePattern("a\n(s)") as any;
  assertEqual(test3.nodes.length, 2);
  assertEqual(test3.nodes[0].data, "a\n");
  // TODO(qti3e) Maybe throw error in this case?
  const test4 = parsePattern("a\\n(s)") as any;
  assertEqual(test4.nodes.length, 2);
  assertEqual(test4.nodes[0].data, "an");
});

test(function parser_unmatchedParentheses() {
  let err;
  try {
    parsePattern("(p(x)r");
  } catch (e) {
    err = e;
  }
  assert(err);
  assertEqual(err.message, "Unmatched parentheses.");
});
