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
