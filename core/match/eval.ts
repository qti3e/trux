import * as types from "./types.ts";
import { StateKind } from "./common.ts";

export interface Eval {
  match(str: string): types.MatchedData;
}

export class Evaluator implements Eval {
  constructor(private data: types.OptimizerData) {}

  match(str: string): types.MatchedData {
    if (str.length > this.data.maxLength || str.length < this.data.minLength) {
      return {
        isMatched: false
      }
    }

    if (!this.data.onlyFixed) {
      let matched = false;
      for (let i = 0; i < this.data.endsWith.length; ++i) {
        if (str.endsWith(this.data.endsWith[i])) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        return {
          isMatched: false
        }
      }
    }
    if (this.data.fixed.includes(str)) {
      return {
        isMatched: true,
        params: {}
      };
    } else if (this.data.onlyFixed) {
      return {
        isMatched: false
      }
    }

    const states = this.data.states;
    const statesStack: types.State[] = [states[0]];
    const pathStack: number[] = [-1];
    const cursorStack: number[] = [0];

    // TODO(qti3e) Write a faster numeric stack using ArrayBuffers.
    while (statesStack.length) {
      const state = statesStack.pop();
      const path = pathStack.pop();
      const cursor = cursorStack.pop();

      if (state.kind === StateKind.END && cursor === str.length) {
        const params = {};
        for (let i = 1; i < cursorStack.length; ++i) {
          const start = cursorStack[i - 1];
          const end = cursorStack[i];
          const state = statesStack[i];
          if (state.kind === StateKind.PARAMETERIC) {
            params[state.name] = str.substring(start, end);
          }
        }
        return {
          isMatched: true,
          params
        };
      }

      if (cursor > str.length) {
        // Fallback.
        continue;
      }

      const nextStateId = state.nextStates[path + 1];
      const nextState = states[nextStateId];
      if (!nextState) {
        if (state.kind === StateKind.PARAMETERIC) {
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
      }
      statesStack.push(nextState);
      pathStack.push(-1);
      cursorStack.push(nextCursor);
    }

    return {
      isMatched: false
    }
  }
}
