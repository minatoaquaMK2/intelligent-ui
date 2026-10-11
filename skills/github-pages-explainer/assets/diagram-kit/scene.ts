import type { NodeContent, Scene, SceneLayout } from "./types";

/** Assemble content with a layout; direct Scene objects are equally supported. */
export function defineScene(
  layout: SceneLayout,
  content: {
    id: string;
    title: string;
    summary: string;
    nodes: Record<string, NodeContent>;
    edgeLabels: Record<string, string>;
    zoneLabels?: Record<string, string>;
  },
): Scene {
  const scene: Scene = {
    id: content.id,
    title: content.title,
    summary: content.summary,
    nodes: layout.nodes.map((node) => {
      if (!content.nodes[node.id])
        throw new Error(`Missing content for node ${node.id}`);
      return { ...node, ...content.nodes[node.id] };
    }),
    edges: layout.edges.map((edge) => {
      if (content.edgeLabels[edge.id] === undefined)
        throw new Error(`Missing label for edge ${edge.id}`);
      return {
        ...edge,
        label: [...edge.label],
        via: edge.via?.map((point) => [...point]),
        text: content.edgeLabels[edge.id],
      };
    }),
    zones: layout.zones?.map((zone) => {
      if (content.zoneLabels?.[zone.id] === undefined)
        throw new Error(`Missing label for zone ${zone.id}`);
      return { ...zone, text: content.zoneLabels[zone.id] };
    }),
  };
  validateScene(scene);
  return scene;
}

export function validateScene(scene: Scene): void {
  if (!scene.id || !scene.nodes.length)
    throw new Error("A scene needs an id and at least one node");
  const nodes = new Set(scene.nodes.map((node) => node.id));
  if (nodes.size !== scene.nodes.length)
    throw new Error(`Duplicate node ids in scene ${scene.id}`);
  const edges = new Set(scene.edges.map((edge) => edge.id));
  if (edges.size !== scene.edges.length)
    throw new Error(`Duplicate edge ids in scene ${scene.id}`);
  for (const node of scene.nodes) {
    if (
      !node.id ||
      !node.name ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y)
    )
      throw new Error(`Invalid node ${node.id} in scene ${scene.id}`);
  }
  for (const edge of scene.edges) {
    if (
      !nodes.has(edge.from) ||
      !nodes.has(edge.to) ||
      !edge.label.every(Number.isFinite)
    )
      throw new Error(`Invalid edge ${edge.id} in scene ${scene.id}`);
  }
}
