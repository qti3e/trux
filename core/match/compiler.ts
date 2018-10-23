// Convert an AST into a data structure that can be used
// to evaluate a pattern.
import { Node, NodeSet, NodeKind } from "./parser.ts";

export const enum StateKind {
  START,
  FIXED,
  PARAMETERIC,
  END,
}

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

export interface StatesObj {
  [id: number]: State;
}

interface SpecialStates {
  start: number;
  end: number;
}

export function compile(set: NodeSet): State[] {
  const states: StatesObj = {};
  const idToASTNode = new Map<number, Node>();
  const specialStates = { start: 0, end: 1 };
  const nodes = set.nodes;
  // emptyStates will initilize states and idToASTNode.
  emptyStates(states, idToASTNode, nodes, specialStates);
  connect(specialStates.start, nodes[0].id, states, idToASTNode);
  for (let i = 0; i < nodes.length - 1; ++i) {
    connect(nodes[i].id, nodes[i + 1].id, states, idToASTNode);
  }
  connect(nodes[nodes.length - 1].id, specialStates.end, states, idToASTNode);
  optinals(nodes, states, idToASTNode);
  if (states[specialStates.end].nextStates.length) {
    throw new Error("Final state must not have any nextStates.");
  }
  const arr = Object.values(states);
  refactorIds(arr);
  return arr;
}

export function refactorIds(states: State[]): void {
  const map = new Map<number, number>();
  for (let i = 0; i < states.length; ++i) {
    map.set(states[i].id, i);
    states[i].id = i;
  }
  for (const state of states) {
    state.nextStates = state.nextStates.map(r => map.get(r));
  }
}

function optinals(
  nodes: Node[],
  states: StatesObj,
  idToASTNode: Map<number, Node>
): void {
  for (const node of nodes) {
    if (isOptional(node)) {
      const left = getConnectedNodesFromLeft(node, states);
      const right = getConnectedNodesFromRight(node, states);
      for (const l of left) {
        for (const r of right) {
          connect(l, r, states, idToASTNode);
        }
      }
    }
    if (node.kind === NodeKind.GROUP) {
      for (const e of node.expressions) {
        optinals(e.nodes, states, idToASTNode);
      }
    }
  }
}

function getConnectedNodesFromLeft(node: Node, states: StatesObj): number[] {
  const ret: number[] = [];
  if (node.kind === NodeKind.GROUP) {
    for (const e of node.expressions) {
      ret.push(...getConnectedNodesFromLeft(e.nodes[0], states));
    }
  } else {
    for (const key in states) {
      if (states[key].nextStates.includes(node.id)) {
        ret.push(states[key].id);
      }
    }
  }
  return ret;
}

function getConnectedNodesFromRight(node: Node, states: StatesObj): number[] {
  const ret: number[] = [];
  if (node.kind === NodeKind.GROUP) {
    for (const e of node.expressions) {
      const lastNode = e.nodes[e.nodes.length - 1];
      ret.push(...getConnectedNodesFromRight(lastNode, states));
    }
  } else {
    ret.push(...states[node.id].nextStates);
  }
  return ret;
}

function connect(
  from: number,
  to: number,
  states: StatesObj,
  idToASTNode: Map<number, Node>
): void {
  const nodeA = idToASTNode.get(from);
  if (nodeA && nodeA.kind === NodeKind.GROUP) {
    for (const e of nodeA.expressions) {
      if (e.nodes.length === 0) {
        throw new Error("Empty group.");
      }
      connect(e.nodes[e.nodes.length - 1].id, to, states, idToASTNode);
    }
    return;
  }

  const nodeB = idToASTNode.get(to);
  if (nodeB && nodeB.kind === NodeKind.GROUP) {
    for (const e of nodeB.expressions) {
      if (e.nodes.length === 0) {
        throw new Error("Empty group.");
      }
      connect(from, e.nodes[0].id, states, idToASTNode);
    }
    return;
  }

  const stateA = states[from];
  const stateB = states[to];

  if (stateA.nextStates.indexOf(to) < 0) {
    stateA.nextStates.push(to);
  }
}

function emptyStates(
  states: StatesObj,
  idToASTNode: Map<number, Node>,
  nodes: Node[],
  specialStates?: SpecialStates
): void {
  for (const node of nodes) {
    idToASTNode.set(node.id, node);
    switch (node.kind) {
      case NodeKind.GROUP:
        for (const s of node.expressions) {
          emptyStates(states, idToASTNode, s.nodes)
        }
        break;
      case NodeKind.LITERAL:
        states[node.id] = {
          kind: StateKind.FIXED,
          id: node.id,
          data: node.data,
          nextStates: []
        };
        break;
      case NodeKind.PARAMETER:
        states[node.id] = {
          kind: StateKind.PARAMETERIC,
          id: node.id,
          name: node.name,
          nextStates: []
        };
        break;
    }
  }
  if (specialStates) {
    const START = 0;
    const END = Math.max(0, ...idToASTNode.keys()) + 1;
    states[END] = {
      kind: StateKind.END,
      id: END,
      nextStates: []
    };
    states[START] = {
      kind: StateKind.START,
      id: START,
      nextStates: []
    };
    specialStates.start = START;
    specialStates.end = END;
  }
}

function isOptional(node: Node): boolean {
  if (!node) {
    return false;
  }
  if (node.kind === NodeKind.PARAMETER || node.kind === NodeKind.GROUP) {
    return node.isOptional;
  }
  return false;
}
