import { multi } from "./match.ts";

// This is how we're going to implement the router :)

const ptn = multi([
  ["/users", 0],
  ["/users", 1],
  ["/users/:id", 2],
  ["/users/:id/followers", 3]
]);

async function t(p) {
  console.log(p);
  return {
    next: true
  };
}

async function main() {
  for (const { params, end } of ptn.matchAll("/users/34/followers")) {
    // t = fns[end];
    console.log("END", end);
    const { next } = await t(params);
    if (!next) {
      break;
    }
  }
}

main();
