// The codes here are to parse a pattern into a valid AST.
import * as types from "./types.ts";
import { NodeKind } from "./common.ts";

let lastId = 0;

interface ParserReturn {
  set: types.NodeSet;
  cursor: number;
}

function parse(pattern: string, from = 0): ParserReturn {
  const set: types.NodeSet = {
    kind: NodeKind.SET,
    id: ++lastId,
    nodes: [],
  }
  const nodes: types.Node[] = set.nodes;

  let cursor = from;
  let isEscaped = false;
  let nextIsEscaped = false;
  while (cursor < pattern.length) {
    const char = pattern[cursor];

    // This ugly part is to handle escape characters.
    isEscaped = nextIsEscaped;
    if (char === "\\") {
      if (isEscaped) {
        nextIsEscaped = false;
      } else {
        nextIsEscaped = true;
        ++cursor;
        continue;
      }
    } else {
      nextIsEscaped = false;
    }

    // Only check special characters when they are not escaped.
    if (!isEscaped) {
      // To parse groups this function calls itself and it provids
      // the second argument.
      // we should only parse the pattern until the first ) because
      // the returned data from this function is going to be used
      // as expressions property of the group node.
      if (from && char === ")") {
        break;
      }

      // Try to find a group.
      if (char === "(") {
        const node: types.GroupNode = {
          kind: NodeKind.GROUP,
          id: ++lastId,
          expressions: [],
          isOptional: false
        };
        const tmp = parse(pattern, cursor + 1);
        const childNodes = tmp.set.nodes;

        let currentSet: types.NodeSet = {
          kind: NodeKind.SET,
          id: ++lastId,
          nodes: [],
        };

        for (let i = 0; i < childNodes.length; ++i) {
          if (childNodes[i].kind === NodeKind.GROUP_SEP) {
            node.expressions.push(currentSet);
            currentSet = {
              kind: NodeKind.SET,
              id: ++lastId,
              nodes: [],
            };
            continue;
          }
          currentSet.nodes.push(childNodes[i]);
        }

        if (currentSet.nodes.length) {
          node.expressions.push(currentSet);
        }

        cursor = tmp.cursor + 1; // +1 to skip )
        // Now cursor points to the character that is next to ')'.
        if (pattern[cursor] === "?") {
          ++cursor;
          node.isOptional = true;
        }
        nodes.push(node);
        continue;
      }

      if (char === "|") {
        nodes.push({
          kind: NodeKind.GROUP_SEP,
          // We never actually return this node from our public API.
          id: -1,
        });
        ++cursor;
        continue;
      }

      // To handle parameters.
      if (char === ":") {
        const node: types.ParameterNode = {
          kind: NodeKind.PARAMETER,
          id: ++lastId,
          name: "",
          isOptional: false,
        };
        let regex = /[a-z_]/i;
        while ((cursor + 1) < pattern.length) {
          if (!regex.test(pattern[cursor + 1])) {
            break;
          }
          regex = /[a-z_0-9]/i;
          ++cursor;
          node.name += pattern[cursor];
        }
        // cursor points to the last character of parameter's name.
        // We don't want to parse that character again so +1.
        ++cursor;
        if (pattern[cursor] === "?") {
          ++cursor;
          node.isOptional = true;
        }
        nodes.push(node);
        // Check for the next node.
        continue;
      }
    }

    // Now look for literals.
    if (char) {
      ++cursor;
    }
    const lastNode = nodes.pop();
    if (lastNode) {
      nodes.push(lastNode);
      if (lastNode.kind === NodeKind.LITERAL) {
        lastNode.data += char;
        continue;
      }
    }
    nodes.push({
      kind: NodeKind.LITERAL,
      id: ++lastId,
      data: char || "",
    });
  }

  // To handle an empty pattern or group.
  const len = nodes.length;
  if (len === 0 || nodes[len - 1].kind === NodeKind.GROUP_SEP) {
    nodes.push({
      kind: NodeKind.LITERAL,
      id: ++lastId,
      data: "",
    });
  }

  return {
    set,
    cursor
  };
}

export function parsePattern(pattern: string): types.NodeSet {
  lastId = 0;
  const { set, cursor } = parse(pattern);
  if (cursor !== pattern.length) {
    throw new Error("Can not parse pattern.");
  }
  return set;
}
