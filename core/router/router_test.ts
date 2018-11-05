import { test, assert, assertEqual } from "../testing/test.ts";
import { Router } from "./router.ts";
import { Methods } from "../http/parser.ts";

const req = {
  method: Methods.GET,
  params: null,
  setParams(t) {
    this.params = t;
  }
};

const route = [];

const router = new Router();

router.post("/hello", () => {
  route.push(0);
});

router.get("/hello", (req, res, next) => {
  route.push(1);
  next();
});

router.get("/hello", () => {
  route.push(2);
});

router.get("/users/:id", () => {
  route.push(3);
});

const router2 = new Router();

router2.get("/", () => {
  route.push(4);
});

router2.get("/hi", () => {
  route.push(5);
});

router2.get("/hi/:r", () => {
  route.push(6);
});

router.use("/r", (req, res, next) => {
  route.push(7);
  next();
});

router.get("/r", router2);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test(async function test_router() {
  await delay(15);

  route.splice(0);
  await router.handle("/hello", req, null);
  assertEqual(route, [1, 2]);
  assertEqual(req.params, {});

  route.splice(0);
  await router.handle("/users/4", req, null);
  assertEqual(route, [3]);
  assertEqual(req.params, { id: "4" });

  route.splice(0);
  await router.handle("/r", req, null);
  assertEqual(route, [7, 4]);
  assertEqual(req.params, {});

  route.splice(0);
  await router.handle("/r/", req, null);
  assertEqual(route, [7, 4]);
  assertEqual(req.params, {});

  route.splice(0);
  await router.handle("/r/hi/5", req, null);
  assertEqual(route, [7, 6]);
  assertEqual(req.params, { r: "5" });

  route.splice(0);
  await router.handle("/r/hi/", req, null);
  assertEqual(route, [7]);
  assertEqual(req.params, { _: "hi/" });

  route.splice(0);
  await router.handle("/r/hi", req, null);
  assertEqual(route, [7, 5]);
  assertEqual(req.params, {});

  route.splice(0);
  req.method = Methods.POST;
  await router.handle("/hello", req, null);
  assertEqual(route, [0]);
  assertEqual(req.params, {});
});
