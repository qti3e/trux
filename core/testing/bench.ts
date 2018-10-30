import { stdout } from "deno";
import { test } from "./test.ts";

export type BenchmarkFunction = () => void | Promise<void>;

const spinner = [
  "◜",
  "◠",
  "◝",
  "◞",
  "◡",
  "◟"
];

const encoder = new TextEncoder();
const RESET = "\x1b[0m";
const FG_RED = "\x1b[31m";
const FG_GREEN = "\x1b[32m";

export function bench(title: string, fns: BenchmarkFunction[], num = 1, innerLoop = 1) {
  if (num < 1) {
    throw new Error("Benchmark: Number of execuations must be greater than 0");
  }
  const cbs = [...fns];
  for (let i = 0; i < cbs.length; ++i) {
    const name = cbs[i].name;
    if (!name) {
      throw new Error("Benchmark function may not be anonymous.");
    }
  }

  let spin = -1;
  let lastSpin = 0;

  const log = async () => {
    if (Date.now() - lastSpin > 50) {
      ++spin;
      spin = spin % (spinner.length);
      lastSpin = Date.now();
    }
    const buffer = encoder.encode(spinner[spin] + ` Running Benchmark - "${title}".\r`);
    await stdout.write(buffer);
  };

  const fn = async () => {
    const times: Array<[BenchmarkFunction, number]> = [];
    log();
    for (let i = 0; i < cbs.length; ++i) {
      const test = cbs[i];
      let start = Date.now();
      let sum = 0;
      for (let j = 0; j < num; ++j) {
        await test();
        if (j % 100 === 0) {
          const time = Date.now() - start;
          sum += time;
          await log();
          start = Date.now();
        }
      }
      const time = Date.now() - start;
      sum += time;
      times.push([test, time]);
    }
    times.sort((a, b) => a[1] - b[1]);
    console.log(RESET);
    for (let i = 0; i < times.length; ++i) {
      const [fn, time] = times[i];
      const data: string[] = [];
      if (time === times[0][1]) {
        data.push(FG_GREEN + " Fastest");
      } else if (time === times[times.length - 1][1]) {
        data.push(FG_RED + " Slowest");
      }
      data.push(` (${time / (num * innerLoop)} ms/test) `);
      data.push(RESET);
      data.push(fn.name);
      console.log(data.join(""));
    }
  };

  // Add it to the test queue.
  test({
    fn,
    name: "Benchmark - " + title
  });
}
