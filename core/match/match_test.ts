import * as types from "./types.ts";
import { test, assert, assertEqual } from "../testing/test.ts";
import { pattern } from "./match.ts";

test(function match() {
  {
    const ptn = pattern("R(xY|T)");
    assertEqual(ptn.match("RxY").isMatched, true);
    assertEqual(ptn.match("RT").isMatched, true);
    assertEqual(ptn.match("RTPP").isMatched, false);
    assertEqual(ptn.match("PxY").isMatched, false);
    assertEqual(ptn.match("R").isMatched, false);
    assertEqual(ptn.match("").isMatched, false);
  }

  {
    const ptn = pattern("R(xY|T)?");
    assertEqual(ptn.match("R").isMatched, true);
    assertEqual(ptn.match("RxY").isMatched, true);
    assertEqual(ptn.match("RT").isMatched, true);
    assertEqual(ptn.match("HT").isMatched, false);
    assertEqual(ptn.match("").isMatched, false);
  }

  {
    const ptn = pattern(":y") as any;
    assertEqual(ptn.match("").isMatched, false);
    assertEqual(ptn.match("A").isMatched, true);
    assertEqual(ptn.match("A").params["y"], "A");
    assertEqual(ptn.match("AASASA").params["y"], "AASASA");
    assertEqual(ptn.match("Qti3e").params["y"], "Qti3e");
  }

  {
    const ptn = pattern(":a/:b") as any;
    assertEqual(ptn.match("/").isMatched, false);
    assertEqual(ptn.match("a/").isMatched, false);
    assertEqual(ptn.match("/a").isMatched, false);
    const m1 = ptn.match("x/y");
    assertEqual(m1.isMatched, true);
    assertEqual(m1.params["a"], "x");
    assertEqual(m1.params["b"], "y");
    const m2 = ptn.match("xxx/rrr/y");
    assertEqual(m2.isMatched, false);
  }

  {
    const ptn = pattern(":a/:_") as any;
    const m1 = ptn.match("xxx/rrr/y");
    assertEqual(m1.isMatched, true);
    assertEqual(m1.params["a"], "xxx");
    assertEqual(m1.params["_"], "rrr/y");
  }

  {
    const ptn = pattern("R(:x)?") as any;
    const m1 = ptn.match("RP");
    assertEqual(m1.params["x"], "P");
    const m2 = ptn.match("R");
    assertEqual(m2.isMatched, true);
    assertEqual(m2.params["x"], undefined);
  }

  {
    const ptn = pattern("R(:x|P)") as any;
    const m1 = ptn.match("RP");
    assertEqual(m1.params["x"], "P");
  }

  {
    const ptn = pattern("R(P|:x)") as any;
    const m1 = ptn.match("RP");
    assertEqual(m1.params["x"], undefined);
    const m2 = ptn.match("RPP");
    assertEqual(m2.isMatched, true);
    assertEqual(m2.params["x"], "PP");
  }
});
