import * as types from "./types.ts";
import { test, assert, assertEqual } from "../testing/test.ts";
import { StateKind } from "./common.ts";
import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";
import {
  checkPath,
  joinFixedStates,
  optimize,
  removeEmptyNodes
} from "./optimizer.ts";

// Utils

let id = 0;

function fixed(data: string, nextStates = []): types.FixedState {
  ++id;
  return {
    kind: StateKind.FIXED,
    id,
    data,
    nextStates
  };
}

function parameteric(name: string, nextStates = []): types.ParametericState {
  ++id;
  return {
    kind: StateKind.PARAMETERIC,
    id,
    name,
    nextStates
  };
}

function str(state: types.State): string {
  switch (state.kind) {
    case StateKind.PARAMETERIC:
      return `:${state.name}`;
    case StateKind.FIXED:
      return state.data;
  }
  return "";
}

// Tests

test(function optimizer_joinFixedStates(): void {
  assertEqual(joinFixedStates([ 
    fixed("Test"),
    fixed("A"),
    parameteric("name")
  ]).map(str), [
    "TestA", ":name"
  ]);

  assertEqual(joinFixedStates([ 
    fixed("Test"),
    parameteric("name")
  ]).map(str), [
    "Test", ":name"
  ]);

  assertEqual(joinFixedStates([ 
    fixed("Test"),
  ]).map(str), [
    "Test"
  ]);

  assertEqual(joinFixedStates([ 
    parameteric("name"),
    fixed("Test"),
  ]).map(str), [
    ":name", "Test"
  ]);

  assertEqual(joinFixedStates([ 
    parameteric("name"),
    fixed("Test"),
    parameteric("name"),
  ]).map(str), [
    ":name", "Test", ":name"
  ]);

  assertEqual(joinFixedStates([ 
    fixed("A"),
    fixed("B"),
    fixed("C"),
  ]).map(str), [
    "ABC"
  ]);

  assertEqual(joinFixedStates([]).map(str), []);
});

test(function optimizer_removeEmptyNodes() {
  assertEqual(removeEmptyNodes([ 
    fixed(""),
    parameteric("A"),
    fixed(""),
    parameteric("B"),
    fixed(""),
    fixed(""),
  ]).map(str), [
    ":A", ":B"
  ]);

});

test(function optimizer_checkPath() {
  // It should work fine.
  checkPath([
    parameteric("A"),
    fixed("."),
    parameteric("B")
  ]);

  let err: Error;

  try {
    checkPath(removeEmptyNodes([
      parameteric("A"),
      fixed(""),
      parameteric("B")
    ]));
  } catch (e) {
    err = e;
  }
  assert(!!err);
  err = null;
    
  try {
    checkPath([
      parameteric("A"),
      fixed("t"),
      parameteric("A")
    ]);
  } catch (e) {
    err = e;
  }
  assert(!!err);
});

test(function optimizer() {
  const pattern = "R(test|XY)";
  const nodes = parsePattern(pattern);
  const states = compile(nodes);
  const data = optimize(states);
  assertEqual(data.minLength, 3); // RXY
  assertEqual(data.maxLength, 5); // Rtest
});
