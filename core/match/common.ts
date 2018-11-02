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
