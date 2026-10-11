import type { Glyph, NodePosition, EdgePosition, SceneLayout } from "./types";
export type ArchetypeId =
  | "pipeline"
  | "loop"
  | "streaming"
  | "convergence"
  | "boundary"
  | "handoff"
  | "evidence";

const node = (
  id: string,
  x: number,
  y: number,
  glyph: Glyph,
): NodePosition => ({
  id,
  x,
  y,
  glyph,
});
const edge = (
  id: string,
  from: string,
  to: string,
  label: [number, number],
  options: Partial<EdgePosition> = {},
): EdgePosition => ({ id, from, to, label, kind: "program", ...options });

// Optional starting layouts, not a prescribed chapter count. Copy or replace per topic.
export const archetypes: Record<ArchetypeId, SceneLayout> = {
  pipeline: {
    nodes: [
      node("model", 70, 122, "source"),
      node("compiler", 392, 122, "compiler"),
      node("runtime", 392, 350, "worker"),
      node("host", 722, 350, "host"),
      node("catalog", 70, 350, "catalog"),
    ],
    edges: [
      edge("dsl", "model", "compiler", [340, 151]),
      edge("ir", "compiler", "runtime", [535, 284]),
      edge("operations", "runtime", "host", [672, 378]),
      edge("catalog", "catalog", "runtime", [340, 378]),
    ],
  },
  loop: {
    nodes: [
      node("input", 100, 122, "input"),
      node("state", 700, 122, "state"),
      node("diff", 700, 350, "diff"),
      node("render", 100, 350, "host"),
    ],
    edges: [
      edge("event", "input", "state", [503, 151], { kind: "event" }),
      edge("evaluate", "state", "diff", [839, 284]),
      edge("ops", "diff", "render", [503, 378]),
      edge("next-input", "render", "input", [54, 284], {
        kind: "event",
        fromPort: "left",
        toPort: "left",
        via: [
          [54, 396],
          [54, 168],
        ],
      }),
    ],
    zones: [
      { id: "host", x: 76, y: 58, width: 240, height: 417 },
      { id: "worker", x: 674, y: 58, width: 242, height: 417 },
    ],
  },
  streaming: {
    nodes: [
      node("tokens", 70, 122, "source"),
      node("repair", 392, 122, "compiler"),
      node("patch", 722, 350, "patch"),
      node("retained", 392, 350, "state"),
      node("fallback", 70, 350, "host"),
    ],
    edges: [
      edge("cumulative", "tokens", "repair", [340, 151]),
      edge("delta", "repair", "patch", [710, 282]),
      edge("load", "patch", "retained", [672, 378]),
      edge("fallback", "repair", "fallback", [264, 282]),
    ],
  },
  convergence: {
    nodes: [
      node("reference", 70, 122, "source"),
      node("snapshot", 70, 350, "data"),
      node("binding", 392, 236, "worker"),
      node("value", 722, 236, "host"),
    ],
    edges: [
      edge("reference", "reference", "binding", [338, 151], {
        fromPort: "right",
        toPort: "left",
        toOffset: -22,
      }),
      edge("app-data", "snapshot", "binding", [338, 423], {
        fromPort: "right",
        toPort: "left",
        toOffset: 22,
      }),
      edge("bound-value", "binding", "value", [672, 265]),
    ],
  },
  boundary: {
    nodes: [
      node("program", 70, 122, "compiler"),
      node("sandbox", 392, 122, "worker"),
      node("watchdog", 70, 350, "guard"),
      node("native", 722, 350, "host"),
    ],
    edges: [
      edge("ast", "program", "sandbox", [340, 151]),
      edge("ops", "sandbox", "native", [707, 282]),
      edge("watch", "watchdog", "sandbox", [287, 284], {
        kind: "event",
        fromPort: "right",
        toPort: "left",
        via: [
          [324, 396],
          [324, 168],
        ],
      }),
    ],
    zones: [{ id: "worker", x: 365, y: 58, width: 241, height: 208 }],
  },
  handoff: {
    nodes: [
      node("choice", 70, 122, "state"),
      node("action", 392, 122, "action"),
      node("message", 722, 350, "message"),
      node("reply", 392, 350, "host"),
    ],
    edges: [
      edge("selected-values", "choice", "action", [340, 151]),
      edge("text", "action", "message", [709, 282], { kind: "event" }),
      edge("new-response", "message", "reply", [672, 378], { kind: "event" }),
    ],
  },
  evidence: {
    nodes: [
      node("implementation", 70, 122, "source"),
      node("verification", 392, 122, "test"),
      node("simulated", 722, 350, "data"),
      node("limits", 392, 350, "limit"),
    ],
    edges: [
      edge("verify", "implementation", "verification", [340, 151]),
      edge("inputs", "verification", "simulated", [710, 282]),
      edge("scope", "verification", "limits", [540, 284], { kind: "event" }),
    ],
  },
};
