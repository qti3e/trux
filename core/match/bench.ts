import { pattern } from "./match.ts";
import { bench } from "../testing/test.ts";

bench("Pattern Matcher", [
  function trux() {
    pattern('/abcd/(:r|p)?/(:t|t)/test');
    pattern('/abcd/(:r|p)?');
  }
], 1e4, 2);
