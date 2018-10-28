import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";
import { optimize } from "./optimizer.ts";
import { log } from "./common.ts";

// const nodes = parsePattern("a(:p|a)(c|x)?");
// a(c:p)
const nodes = parsePattern("(r:id|r:id)?");
const states = compile(nodes);
log(states);
log(optimize(states));
