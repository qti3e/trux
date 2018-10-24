import * as types from "./types.ts";
import { joinFixedStates } from "./optimizer.ts";
import { test, assertEqual } from "../testing/test.ts";
import { StateKind } from "./common.ts";

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
