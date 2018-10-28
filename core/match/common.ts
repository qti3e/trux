import * as types from "./types.ts";

export const enum StateKind {
  START,
  FIXED,
  PARAMETERIC,
  END,
}

export const enum NodeKind {
  SET,
  LITERAL,
  PARAMETER,
  GROUP,
  /* @private */ GROUP_SEP,
}

export function refactorIds(states: types.State[]): void {
  const map = new Map<number, number>();
  for (let i = 0; i < states.length; ++i) {
    map.set(states[i].id, i);
    states[i].id = i;
  }
  for (const state of states) {
    state.nextStates = state.nextStates.map(r => map.get(r));
  }
}

export function log(o) {
  var cache = [];
  console.log(JSON.stringify(o, function(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Duplicate reference found
        try {
          // If this value does not reference a parent it can be deduped
          return JSON.parse(JSON.stringify(value));
        } catch (error) {
          // discard key if value cannot be deduped
          return;
        }
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  }, 2));
  cache = null; // Enable garbage collection
}
