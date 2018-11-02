import { NodeKind, StateKind } from "./common.ts";

export interface StartState {
  kind: StateKind.START;
  id: number;
  nextStates: number[];
}

export interface FixedState {
  kind: StateKind.FIXED;
  id: number;
  data: string;
  nextStates: number[];
}

export interface ParametericState {
  kind: StateKind.PARAMETERIC;
  id: number;
  name: string;
  nextStates: number[];
}

export interface EndState {
  kind: StateKind.END;
  id: number;
  // It must be empty.
  // Otherwise there is an error.
  nextStates: number[];
}

export type State =
  | StartState
  | FixedState
  | ParametericState
  | EndState;

// A path is a array of states in order, which means
// we don't care about nextStates property when using
// this type.
export type Path = State[];

export interface StatesObj {
  [id: number]: State;
}

export interface SpecialStates {
  start: number;
  end: number;
}

export interface NodeSet {
  kind: NodeKind.SET;
  id: number;
  nodes: Node[];
}

export interface LiteralNode {
  kind: NodeKind.LITERAL;
  id: number;
  data: string;
}

export interface ParameterNode {
  kind: NodeKind.PARAMETER;
  id: number;
  name: string;
  isOptional: boolean;
}

export interface GroupNode {
  kind: NodeKind.GROUP;
  id: number;
  expressions: Array<NodeSet>;
  isOptional: boolean;
}

export interface GroupSepNode {
  kind: NodeKind.GROUP_SEP;
  id: number;
}

export type Node =
  | LiteralNode
  | ParameterNode
  | GroupNode
  | GroupSepNode;

export interface OptimizerData {
  minLength: number;
  maxLength: number;
  states?: State[];
}

export type FixedStateArray = FixedState[];

export interface Matched {
  isMatched: true;
  params: Record<string, string>;
}

export interface NotMatched {
  isMatched: false;
}

export type MatchedData = Matched | NotMatched;
