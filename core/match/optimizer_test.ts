import { joinFixedStates } from "./optimizer.ts"; import { assertEqual } from "./test_util.ts";
import { State, StateKind, FixedState, ParametericState } from "./compiler.ts";

// TODO(qti3e) Move all of the types to types.ts

// Utils

let id = 0;

function fixed(data: string, nextStates = []): FixedState {
  ++id;
  return {
    kind: StateKind.FIXED,
    id,
    data,
    nextStates
  };
}

function parameteric(name: string, nextStates = []): ParametericState {
  ++id;
  return {
    kind: StateKind.PARAMETERIC,
    id,
    name,
    nextStates
  };
}

function str(state: State): string {
  switch (state.kind) {
    case StateKind.PARAMETERIC:
      return `:${state.name}`;
    case StateKind.FIXED:
      return state.data;
  }
  return "";
}

// Tests

(function test_joinFixedStates(): void {
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

  console.log("test_joinFixedStates passed.");
})();
