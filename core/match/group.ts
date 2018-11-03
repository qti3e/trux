import { multi } from "./match.ts";

// This is how we're going to implement the router :)

const ptn = multi([
  ["/users", 0],
  ["/users", 1],
  ["/users/:_", 2],
  ["/users/:id/followers", 3]
]);

async function t(p) {
  console.log(p);
  return {
    next: false
  };
}

async function main() {
  const tmp = ptn.matchAll("/users/34/followers");
  for (const { params, end } of tmp) {
    // t = fns[end];
    console.log("END", end);
    const { next } = await t(params);
    if (!next) {
      break;
    }
  }
}

main();
