import type { EdgePosition, NodePosition, Port, SceneLayout } from "./types";
export const formatStep = (index: number) => String(index + 1).padStart(2, "0");
export const clampSpacing = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 50));

export function positionedNodes(
  layout: SceneLayout,
  spacing: number,
): NodePosition[] {
  const spread = (clampSpacing(spacing) - 50) * 0.45;
  return layout.nodes.map((item) => ({
    ...item,
    y: item.y + (item.y > 300 ? spread : item.y < 200 ? -spread / 2 : 0),
  }));
}

export function edgePath(
  flow: EdgePosition,
  nodes: NodePosition[],
  flat: boolean,
  spacing: number,
): string {
  const from = nodes.find((item) => item.id === flow.from);
  const to = nodes.find((item) => item.id === flow.to);
  if (!from || !to) throw new Error(`Edge ${flow.id} refers to a missing node`);
  const vertical = Math.abs(from.x - to.x) < 40;
  const diagonal = Math.abs(from.y - to.y) > 80;
  const fromPort =
    flow.fromPort ??
    (diagonal
      ? to.y > from.y
        ? "bottom"
        : "top"
      : to.x > from.x
        ? "right"
        : "left");
  const toPort =
    flow.toPort ??
    (diagonal
      ? to.y > from.y
        ? "top"
        : "bottom"
      : to.x > from.x
        ? "left"
        : "right");
  function port(n: NodePosition, side: Port, offset = 0): [number, number] {
    const dx = flat ? 0 : 30,
      dy = flat ? 0 : 21;
    return side === "left"
      ? [n.x - 9, n.y + 46 + offset]
      : side === "right"
        ? [n.x + 184 + dx + 9, n.y + 46 + offset]
        : side === "top"
          ? [n.x + 92, n.y - dy - 9]
          : [n.x + 92, n.y + 101];
  }
  const start = port(from, fromPort, flow.fromOffset),
    end = port(to, toPort, flow.toOffset);
  if (flow.via) {
    const spread = (clampSpacing(spacing) - 50) * 0.45;
    return [
      start,
      ...flow.via.map(([x, y]): [number, number] => [
        x,
        y + (y > 300 ? spread : -spread / 2),
      ]),
      end,
    ]
      .map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`)
      .join(" ");
  }
  if (vertical) return `M${start.join(" ")} L${end.join(" ")}`;
  const horizontalPorts = ["left", "right"].includes(fromPort);
  const middle = horizontalPorts
    ? (start[0] + end[0]) / 2
    : (start[1] + end[1]) / 2;
  return horizontalPorts
    ? `M${start.join(" ")} H${middle} V${end[1]} H${end[0]}`
    : `M${start.join(" ")} V${middle} H${end[0]} V${end[1]}`;
}

/** Keep the caption's opaque background out of neighboring node faces. */
export function captionBox(
  flow: EdgePosition & { text: string },
  nodes: NodePosition[],
  flat: boolean,
  spacing: number,
) {
  const spread = (clampSpacing(spacing) - 50) * 0.45;
  const [x, initialY] = flow.label;
  const y =
    initialY + (initialY > 350 ? spread : initialY < 200 ? -spread / 2 : 0);
  let halfWidth = Math.min(x - 8, 992 - x, 85);
  for (const node of nodes) {
    if (y + 7 < node.y - (flat ? 0 : 21) || y - 14 > node.y + 92) continue;
    const right = node.x + 184 + (flat ? 0 : 30);
    if (x < node.x) halfWidth = Math.min(halfWidth, node.x - x - 8);
    else if (x > right) halfWidth = Math.min(halfWidth, x - right - 8);
  }
  const measured = Array.from(flow.text).reduce(
    (size, char) => size + (/[^\x00-\x7F]/.test(char) ? 12 : 7.2),
    16,
  );
  const width = Math.max(24, Math.min(measured, halfWidth * 2));
  return { x: x - width / 2, y: y - 14, width, height: 22 };
}
