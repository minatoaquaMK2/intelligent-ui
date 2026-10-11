export type Glyph =
  | "source"
  | "compiler"
  | "worker"
  | "host"
  | "catalog"
  | "input"
  | "state"
  | "diff"
  | "patch"
  | "data"
  | "guard"
  | "action"
  | "message"
  | "test"
  | "limit"
  | "web";
export type Port = "left" | "right" | "top" | "bottom";
export interface NodePosition {
  id: string;
  x: number;
  y: number;
  glyph: Glyph;
}
export interface NodeContent {
  name: string;
  eyebrow?: string;
  role: string;
  detail: string;
  facts?: string[];
  code?: string;
  source?: { label: string; href: string };
  color?: string;
}
export interface SceneNode extends NodePosition, NodeContent {}
export interface EdgePosition {
  id: string;
  from: string;
  to: string;
  kind: "program" | "event";
  /** Caption center in the 1000 × 520 coordinate system; keep labels concise. */
  label: [number, number];
  fromPort?: Port;
  toPort?: Port;
  fromOffset?: number;
  toOffset?: number;
  via?: [number, number][];
}
export interface SceneEdge extends EdgePosition {
  text: string;
}
export interface ZonePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface SceneLayout {
  nodes: NodePosition[];
  edges: EdgePosition[];
  zones?: ZonePosition[];
}
export interface Scene extends Omit<SceneLayout, "nodes" | "edges" | "zones"> {
  id: string;
  title: string;
  summary: string;
  nodes: SceneNode[];
  edges: SceneEdge[];
  zones?: (ZonePosition & { text: string })[];
}
export interface DiagramLabels {
  ariaLabel: string;
  viewAngle: string;
  view25D: string;
  viewFlat: string;
  spacing: string;
  focusView: string;
  exitFocus: string;
  legendData: string;
  legendEvent: string;
  note: string;
  step: string;
  moduleLabel: string;
  previousStep: string;
  nextStep: string;
  autoplay: string;
  stopAutoplay: string;
  pauseMotion: string;
  resumeMotion: string;
  reducedMotion: string;
  selectStep: (name: string) => string;
}
