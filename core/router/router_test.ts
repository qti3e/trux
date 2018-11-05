import { Router } from "./router.ts";
import { Methods } from "../http/parser.ts";

const req = {
  method: Methods.GET,
  setParams(t) {
    console.log("Params", t);
  }
};

const router = new Router();

router.post("/hello", () => {
  console.log("3");
});

router.get("/hello", (req, res, next) => {
  console.log("1");
  next();
});

router.get("/hello", () => {
  console.log("2");
});

router.get("/users/:id", () => {
  console.log("R");
});

const router2 = new Router();

router2.get("/", () => {
  console.log("P");
});

router2.get("/hi", () => {
  console.log("hi");
});

router2.get("/hi/:r", () => {
  console.log("HOO");
});

router.get("/r", router2);

setTimeout(() => {
  router.handle("/hello", req, null);
  router.handle("/users/4", req, null);
  router.handle("/r/", req, null);
  router.handle("/r/hi", req, null);
  router.handle("/r/hi/5", req, null);
}, 100);
