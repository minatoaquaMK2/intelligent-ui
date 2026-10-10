import type { LessonId } from '../i18n/types';

export const formatChapterNumber = (index: number) => String(index + 1).padStart(2, '0');
export type BoundaryRoute = 'native' | 'web';
export type SceneId = LessonId | 'boundary-web';
export type Port = 'left' | 'right' | 'top' | 'bottom';
export type Glyph =
  | 'source'
  | 'compiler'
  | 'worker'
  | 'host'
  | 'catalog'
  | 'input'
  | 'state'
  | 'diff'
  | 'patch'
  | 'data'
  | 'guard'
  | 'action'
  | 'message'
  | 'test'
  | 'limit'
  | 'web';
export interface SceneNodePosition {
  id: string;
  x: number;
  y: number;
  glyph: Glyph;
}
export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  kind: 'program' | 'event';
  label: [number, number];
  fromPort?: Port;
  toPort?: Port;
  fromOffset?: number;
  toOffset?: number;
  via?: [number, number][];
}
export interface SceneLayout {
  nodes: SceneNodePosition[];
  edges: SceneEdge[];
  zones?: { id: string; x: number; y: number; width: number; height: number }[];
}
const node = (id: string, x: number, y: number, glyph: Glyph): SceneNodePosition => ({
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
  options: Partial<SceneEdge> = {},
): SceneEdge => ({ id, from, to, label, kind: 'program', ...options });

// Each topic owns its topology. Module steps are local to a scene; chapter
// numbers never index into a shared pipeline diagram.
export const sceneLayouts: Record<SceneId, SceneLayout> = {
  pipeline: {
    nodes: [
      node('model', 70, 122, 'source'),
      node('compiler', 392, 122, 'compiler'),
      node('runtime', 392, 350, 'worker'),
      node('host', 722, 350, 'host'),
      node('catalog', 70, 350, 'catalog'),
    ],
    edges: [
      edge('dsl', 'model', 'compiler', [340, 151]),
      edge('ir', 'compiler', 'runtime', [535, 284]),
      edge('operations', 'runtime', 'host', [672, 378]),
      edge('catalog', 'catalog', 'runtime', [340, 378]),
    ],
  },
  state: {
    nodes: [
      node('input', 100, 122, 'input'),
      node('state', 700, 122, 'state'),
      node('diff', 700, 350, 'diff'),
      node('render', 100, 350, 'host'),
    ],
    edges: [
      edge('event', 'input', 'state', [503, 151], { kind: 'event' }),
      edge('evaluate', 'state', 'diff', [839, 284]),
      edge('ops', 'diff', 'render', [503, 378]),
      edge('next-input', 'render', 'input', [54, 284], {
        kind: 'event',
        fromPort: 'left',
        toPort: 'left',
        via: [
          [54, 396],
          [54, 168],
        ],
      }),
    ],
    zones: [
      { id: 'host', x: 76, y: 58, width: 240, height: 417 },
      { id: 'worker', x: 674, y: 58, width: 242, height: 417 },
    ],
  },
  streaming: {
    nodes: [
      node('tokens', 70, 122, 'source'),
      node('repair', 392, 122, 'compiler'),
      node('patch', 722, 350, 'patch'),
      node('retained', 392, 350, 'state'),
      node('fallback', 70, 350, 'host'),
    ],
    edges: [
      edge('cumulative', 'tokens', 'repair', [340, 151]),
      edge('delta', 'repair', 'patch', [710, 282]),
      edge('load', 'patch', 'retained', [672, 378]),
      edge('fallback', 'repair', 'fallback', [264, 282]),
    ],
  },
  data: {
    nodes: [
      node('reference', 70, 122, 'source'),
      node('snapshot', 70, 350, 'data'),
      node('binding', 392, 236, 'worker'),
      node('value', 722, 236, 'host'),
    ],
    edges: [
      edge('reference', 'reference', 'binding', [338, 151], {
        fromPort: 'right',
        toPort: 'left',
        toOffset: -22,
      }),
      edge('app-data', 'snapshot', 'binding', [338, 423], {
        fromPort: 'right',
        toPort: 'left',
        toOffset: 22,
      }),
      edge('bound-value', 'binding', 'value', [672, 265]),
    ],
  },
  boundary: {
    nodes: [
      node('program', 70, 122, 'compiler'),
      node('sandbox', 392, 122, 'worker'),
      node('watchdog', 70, 350, 'guard'),
      node('native', 722, 350, 'host'),
    ],
    edges: [
      edge('ast', 'program', 'sandbox', [340, 151]),
      edge('ops', 'sandbox', 'native', [707, 282]),
      edge('watch', 'watchdog', 'sandbox', [287, 284], {
        kind: 'event',
        fromPort: 'right',
        toPort: 'left',
        via: [
          [324, 396],
          [324, 168],
        ],
      }),
    ],
    zones: [{ id: 'worker', x: 365, y: 58, width: 241, height: 208 }],
  },
  'boundary-web': {
    nodes: [
      node('web-source', 70, 122, 'source'),
      node('web-placeholder', 392, 122, 'compiler'),
      node('web-frame', 722, 350, 'web'),
      node('web-state', 392, 350, 'state'),
    ],
    edges: [
      edge('html', 'web-source', 'web-placeholder', [340, 151]),
      edge('frame', 'web-placeholder', 'web-frame', [704, 282]),
      edge('app-state', 'web-frame', 'web-state', [672, 378]),
    ],
    zones: [{ id: 'frame', x: 364, y: 292, width: 573, height: 183 }],
  },
  action: {
    nodes: [
      node('choice', 70, 122, 'state'),
      node('action', 392, 122, 'action'),
      node('message', 722, 350, 'message'),
      node('reply', 392, 350, 'host'),
    ],
    edges: [
      edge('selected-values', 'choice', 'action', [340, 151]),
      edge('text', 'action', 'message', [709, 282], { kind: 'event' }),
      edge('new-response', 'message', 'reply', [672, 378], { kind: 'event' }),
    ],
  },
  evidence: {
    nodes: [
      node('implementation', 70, 122, 'source'),
      node('verification', 392, 122, 'test'),
      node('simulated', 722, 350, 'data'),
      node('limits', 392, 350, 'limit'),
    ],
    edges: [
      edge('verify', 'implementation', 'verification', [340, 151]),
      edge('inputs', 'verification', 'simulated', [710, 282]),
      edge('scope', 'verification', 'limits', [540, 284], { kind: 'event' }),
    ],
  },
};

export const sceneIdFor = (lesson: LessonId, route: BoundaryRoute = 'native'): SceneId =>
  lesson === 'boundary' && route === 'web' ? 'boundary-web' : lesson;

export function positionedNodes(layout: SceneLayout, spacing: number): SceneNodePosition[] {
  const spread = (spacing - 50) * 0.45;
  return layout.nodes.map((item) => ({
    ...item,
    y: item.y + (item.y > 300 ? spread : item.y < 200 ? -spread / 2 : 0),
  }));
}

export function edgePath(
  flow: SceneEdge,
  nodes: SceneNodePosition[],
  flat: boolean,
  spacing: number,
): string {
  const from = nodes.find((item) => item.id === flow.from)!;
  const to = nodes.find((item) => item.id === flow.to)!;
  const vertical = Math.abs(from.x - to.x) < 40;
  const diagonal = Math.abs(from.y - to.y) > 80;
  const fromPort =
    flow.fromPort ??
    (diagonal ? (to.y > from.y ? 'bottom' : 'top') : to.x > from.x ? 'right' : 'left');
  const toPort =
    flow.toPort ??
    (diagonal ? (to.y > from.y ? 'top' : 'bottom') : to.x > from.x ? 'left' : 'right');
  function port(n: SceneNodePosition, side: Port, offset = 0): [number, number] {
    const dx = flat ? 0 : 30,
      dy = flat ? 0 : 21;
    return side === 'left'
      ? [n.x - 9, n.y + 46 + offset]
      : side === 'right'
        ? [n.x + 184 + dx + 9, n.y + 46 + offset]
        : side === 'top'
          ? [n.x + 92, n.y - dy - 9]
          : [n.x + 92, n.y + 101];
  }
  const start = port(from, fromPort, flow.fromOffset),
    end = port(to, toPort, flow.toOffset);
  if (flow.via) {
    const spread = (spacing - 50) * 0.45;
    return [
      start,
      ...flow.via.map(([x, y]): [number, number] => [x, y + (y > 300 ? spread : -spread / 2)]),
      end,
    ]
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`)
      .join(' ');
  }
  if (vertical) return `M${start.join(' ')} L${end.join(' ')}`;
  const horizontalPorts = ['left', 'right'].includes(fromPort);
  const middle = horizontalPorts ? (start[0] + end[0]) / 2 : (start[1] + end[1]) / 2;
  return horizontalPorts
    ? `M${start.join(' ')} H${middle} V${end[1]} H${end[0]}`
    : `M${start.join(' ')} V${middle} H${end[0]} V${end[1]}`;
}
