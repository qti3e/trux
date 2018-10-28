import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";
import { optimize } from "./optimizer.ts";
import { Eval, Evaluator } from "./eval.ts";

export function pattern(pattern: string): Eval {
  const nodes = parsePattern(pattern);
  const states = compile(nodes);
  const optimized = optimize(states);
  return new Evaluator(optimized);
}

const ptr = pattern("(:b|d)?");
console.log(ptr.match(""));
console.log(ptr.match("abh"));
console.log(ptr.match("adh"));
console.log(ptr.match("ach"));
console.log(ptr.match("ach"));
