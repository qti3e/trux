import * as types from "./types.ts";
import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";
import { getAllPaths, optimize } from "./optimizer.ts";
import { Eval, Evaluator } from "./eval.ts";
import { StateKind } from "./common.ts";

export { Eval } from "./eval.ts";
export { hasUnderscore } from "./parser.ts";

// TODO(qti3e) Add Regexp backend.

export function pattern(pattern: string): Eval {
  const nodes = parsePattern(pattern);
  const states = compile(nodes);
  const paths = getAllPaths(states);
  const optimized = optimize(paths);
  return new Evaluator(optimized);
}

export function multi(patterns: types.MultiPattern[]): Eval {
  const paths = [];
  for (let i = 0; i < patterns.length; ++i) {
    const [ pattern, data ] = patterns[i];
    const nodes = parsePattern(pattern);
    const states = compile(nodes);
    const keys = Object.keys(states);
    const lastState = states[keys[keys.length - 1]];
    if (lastState.kind === StateKind.END) {
      lastState.data = data;
      paths.push(...getAllPaths(states));
    } else {
      throw new Error("Excpected END state.");
    }
  }
  const optimized = optimize(paths);
  return new Evaluator(optimized);
}
