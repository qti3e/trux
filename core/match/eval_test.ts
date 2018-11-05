import { test, assertEqual } from "../testing/test.ts";
import { pattern } from "./match.ts";

test(function eval_hasUnderscore() {
  {
    const ptn = pattern("");
    assertEqual(ptn.hasUnderscore, false);
  }

  {
    const ptn = pattern(":R");
    assertEqual(ptn.hasUnderscore, false);
  }

  {
    const ptn = pattern(":_");
    assertEqual(ptn.hasUnderscore, true);
  }

  {
    const ptn = pattern("(:_)?");
    assertEqual(ptn.hasUnderscore, true);
  }

  {
    const ptn = pattern("(:_|:_)X");
    assertEqual(ptn.hasUnderscore, true);
  }
});
