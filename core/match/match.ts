import { parsePattern } from "./parser.ts";
import { compile } from "./compiler.ts";
import { optimize } from "./optimizer.ts";

export function log(o) {
  var cache = [];
  console.log(JSON.stringify(o, function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Duplicate reference found
        try {
          // If this value does not reference a parent it can be deduped
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          // discard key if value cannot be deduped
          return;
        }
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  }, 2));
  cache = null; // Enable garbage collection
}

const nodes = parsePattern("a(:p|a)(c|x)?");
const states = compile(nodes);
log(states);
log(optimize(states));
