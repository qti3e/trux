// Convert an AST into a data structure that can be used
// to evaluate a pattern.
import * as types from "./types.ts";
import { NodeKind, StateKind, refactorIds } from "./common.ts";

export function compile(set: types.NodeSet): types.State[] {
  const states: types.StatesObj = {};
  const idToASTNode = new Map<number, types.Node>();
  const specialStates: types.SpecialStates = { start: 0, end: 1 };
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

function optinals(
  nodes: types.Node[],
  states: types.StatesObj,
  idToASTNode: Map<number, types.Node>
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

function getConnectedNodesFromLeft(
  node: types.Node,
  states: types.StatesObj
): number[] {
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

function getConnectedNodesFromRight(
  node: types.Node,
  states: types.StatesObj
): number[] {
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
  states: types.StatesObj,
  idToASTNode: Map<number, types.Node>
): void {
  const nodeA = idToASTNode.get(from);
  if (nodeA && nodeA.kind === NodeKind.GROUP) {
    for (const e of nodeA.expressions) {
      if (e.nodes.length === 0) {
        throw new Error("Empty group.");
      }
      connect(e.nodes[e.nodes.length - 1].id, to, states, idToASTNode);
      for (let i = 0; i < e.nodes.length - 1; ++i) {
        connect(e.nodes[i].id, e.nodes[i + 1].id, states, idToASTNode);
      }
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
  states: types.StatesObj,
  idToASTNode: Map<number, types.Node>,
  nodes: types.Node[],
  specialStates?: types.SpecialStates
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

function isOptional(node: types.Node): boolean {
  if (!node) {
    return false;
  }
  if (node.kind === NodeKind.PARAMETER || node.kind === NodeKind.GROUP) {
    return node.isOptional;
  }
  return false;
}
