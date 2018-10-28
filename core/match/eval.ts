import * as types from "./types.ts";

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
      for (const end of this.data.endsWith) {
        if (str.endsWith(end)) {
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

    // TODO(qti3e)
    return null;
  }
}
