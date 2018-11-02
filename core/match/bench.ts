import { pattern } from "./match.ts";
import { bench } from "../testing/test.ts";

bench("Pattern Matcher", [
  function trux() {
    pattern('/abcd/(:r|p)?/(:t|t)/test');
    pattern('/abcd/(:r|p)?');
  }
], 1e3, 2);

const ptn = pattern("RT(F|:p)HL");
const rgx = /RT(F|:p)HL/;

bench("match", [
  function trux() {
    ptn.match("RTFHL");
    ptn.match("RTFPHL");
    ptn.match("RTFPHLASHDFKJDHJKDFHDDFJKHJKHFDJKFHKDJHFKJDHFJKDHF");
    ptn.match("BTFPHLASHDFKJDHJKDFHDDFJKHJKHFDJKFHKDJHFKJDHFJKDHF");
  },
  function regexp() {
    rgx.test("RTFHL");
    rgx.test("RTFPHL");
    rgx.test("RTFPHLASHDFKJDHJKDFHDDFJKHJKHFDJKFHKDJHFKJDHFJKDHF");
    rgx.test("BTFPHLASHDFKJDHJKDFHDDFJKHJKHFDJKFHKDJHFKJDHFJKDHF");
  }
], 1e2, 3);
