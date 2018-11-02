import * as types from "./types.ts";
import { StateKind } from "./common.ts";

export interface Eval {
  match(str: string): types.MatchedData;
  matchAll(str: string): IterableIterator<types.MatchResult>;
}

export class Evaluator implements Eval {
  constructor(private data: types.OptimizerData) {}

  *matchAll(str: string): IterableIterator<types.MatchResult> {
    const { minLength, maxLength, states } = this.data;
    if (str.length > maxLength || str.length < minLength) {
      return;
    }

    const statesStack: types.State[] = [states[0]];
    const pathStack: number[] = [-1];
    const cursorStack: number[] = [0];

    // TODO(qti3e) Write a faster numeric stack using ArrayBuffers.
    while (statesStack.length) {
      const state = statesStack.pop();
      const path = pathStack.pop();
      const cursor = cursorStack.pop();

      if (cursor > str.length) {
        // Fallback.
        continue;
      }

      const nextStateId = state.nextStates[path + 1];
      const nextState = states[nextStateId];
      if (!nextState) {
        if (state.kind === StateKind.PARAMETERIC &&
          (str[cursor] !== "/" || state.name === "_")) {
          statesStack.push(state);
          pathStack.push(-1);
          cursorStack.push(cursor + 1);
        }
        // Fallback.
        continue;
      }

      // Push next state.
      statesStack.push(state);
      pathStack.push(path + 1);
      cursorStack.push(cursor);

      let nextCursor = cursor;
      if (nextState.kind === StateKind.FIXED) {
        nextCursor += nextState.data.length;
        if (!str.startsWith(nextState.data, cursor)) {
          continue;
        }
      } else if (nextState.kind === StateKind.PARAMETERIC) {
        nextCursor += 1;
      } else if (nextState.kind === StateKind.END) {
        if (nextCursor < str.length) {
          continue;
        }
        const params = {};
        for (let i = 1; i < cursorStack.length; ++i) {
          const start = cursorStack[i - 1];
          const end = cursorStack[i];
          const state = statesStack[i];
          if (state.kind === StateKind.PARAMETERIC) {
            params[state.name] = str.substring(start, end);
          }
        }
        yield { params, end: nextState.data };
      }
      statesStack.push(nextState);
      pathStack.push(-1);
      cursorStack.push(nextCursor);
    }
  }

  match(str: string): types.MatchedData {
    for (const { params } of this.matchAll(str)) {
      return {
        isMatched: true,
        params
      };
    }
    return {
      isMatched: false
    };
  }
}
