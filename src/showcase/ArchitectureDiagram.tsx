import { useId } from 'react';
import {
  Activity,
  ArrowUpRight,
  Braces,
  Code2,
  Database,
  FileText,
  LayoutPanelTop,
  ListChecks,
  MessageSquare,
  MousePointer2,
  Network,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  SquareCode,
  TriangleAlert,
} from 'lucide-react';
import type { Translations } from '../i18n/types';
import { edgePath, formatChapterNumber, positionedNodes, type Glyph } from './architecture';
import type { Scene } from './scenes';

const icons: Record<Glyph, typeof Code2> = {
  source: FileText,
  compiler: Code2,
  worker: Braces,
  host: LayoutPanelTop,
  catalog: ListChecks,
  input: MousePointer2,
  state: SlidersHorizontal,
  diff: Network,
  patch: RefreshCw,
  data: Database,
  guard: Shield,
  action: ArrowUpRight,
  message: MessageSquare,
  test: Activity,
  limit: TriangleAlert,
  web: SquareCode,
};

export function ArchitectureDiagram({
  scene,
  heading,
  selected,
  onSelect,
  flat,
  animated,
  spacing,
  labels,
}: {
  scene: Scene;
  heading: string;
  selected: string;
  onSelect: (id: string) => void;
  flat: boolean;
  animated: boolean;
  spacing: number;
  labels: Translations['diagram'];
}) {
  const id = useId().replace(/:/g, '');
  const positions = positionedNodes(scene, spacing);
  const spread = (spacing - 50) * 0.45;
  return (
    <svg
      className="s-architecture-svg"
      viewBox="0 0 1000 520"
      role="group"
      aria-label={`${heading} — ${labels.ariaLabel}`}
      data-scene={scene.id}
      data-motion={animated ? 'playing' : 'paused'}
    >
      <title>{heading}</title>
      <desc>{scene.nodes.map((node) => `${node.name}: ${node.role}`).join('; ')}</desc>
      <defs>
        <pattern id={`${id}-dots`} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="#c9d2c2" />
        </pattern>
        {(['program', 'event'] as const).map((kind) => (
          <marker
            key={kind}
            id={`${id}-${kind}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path
              d="M1 1 9 5 1 9"
              fill="none"
              stroke={kind === 'program' ? '#648b76' : '#bb805b'}
              strokeWidth="1.5"
            />
          </marker>
        ))}
      </defs>
      <rect width="1000" height="520" fill={`url(#${id}-dots)`} opacity="0.55" />
      {!flat && (
        <path
          d="M24 421 422 351 974 439 466 511Z"
          fill="#e3eadb"
          fillOpacity="0.38"
          stroke="#d4dfca"
          strokeWidth="0.8"
        />
      )}
      {scene.zones?.map((zone) => (
        <g key={zone.id} className="s-scene-zone">
          <rect
            x={zone.x}
            y={zone.y + (zone.y > 200 ? spread : -spread / 2)}
            width={zone.width}
            height={zone.height + (zone.height > 300 ? spread * 1.5 : 0)}
            rx="7"
            fill="none"
            stroke="#cbd7c3"
            strokeDasharray="5 7"
          />
          <text
            x={zone.x + 12}
            y={zone.y - 12 + (zone.y > 200 ? spread : -spread / 2)}
            fontSize="11"
            fill="#78906f"
          >
            {zone.text}
          </text>
        </g>
      ))}
      {scene.edges.map((flow) => {
        const active = flow.from === selected || flow.to === selected;
        const color = flow.kind === 'program' ? '#648b76' : '#bb805b';
        return (
          <g key={flow.id} className={`s-diagram-flow ${active ? 'is-relevant' : 'is-muted'}`}>
            <path
              className={`s-flow ${active ? 'is-flowing' : ''}`}
              data-flow={flow.id}
              data-from={flow.from}
              data-to={flow.to}
              d={edgePath(flow, positions, flat, spacing)}
              fill="none"
              stroke={color}
              strokeWidth={active ? 2.2 : 1.5}
              markerEnd={`url(#${id}-${flow.kind})`}
            />
          </g>
        );
      })}
      {/* Paint captions after every connector so crossing routes cannot obscure text. */}
      {scene.edges.map((flow) => {
        const active = flow.from === selected || flow.to === selected;
        const x = flow.label[0];
        const y =
          flow.label[1] + (flow.label[1] > 350 ? spread : flow.label[1] < 200 ? -spread / 2 : 0);
        const width = Array.from(flow.text).reduce(
          (size, char) => size + (/[^\x00-\x7F]/.test(char) ? 12 : 7.2),
          16,
        );
        return (
          <g key={`caption-${flow.id}`} className="s-flow-caption" aria-hidden="true">
            <rect x={x - width / 2} y={y - 14} width={width} height="21" rx="4" fill="#f1f4eb" />
            <text
              className="s-flow-label"
              x={x}
              y={y}
              textAnchor="middle"
              fill={flow.kind === 'program' ? '#50755f' : '#a26540'}
              fontSize="12"
              opacity={active ? 1 : 0.75}
            >
              {flow.text}
            </text>
          </g>
        );
      })}
      {scene.nodes.map((node, index) => {
        const { x, y } = positions[index],
          active = node.id === selected,
          Icon = icons[node.glyph];
        return (
          <g
            key={node.id}
            className={`s-diagram-node ${active ? 'is-active' : ''}`}
            data-node={node.id}
            role="button"
            tabIndex={0}
            aria-label={`${labels.step} ${formatChapterNumber(index)} · ${node.name}: ${node.role}`}
            aria-pressed={active}
            onClick={() => onSelect(node.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(node.id);
              }
            }}
          >
            {!flat && (
              <ellipse cx={x + 105} cy={y + 110} rx="102" ry="12" fill="#9fb299" opacity="0.1" />
            )}
            <Icon
              x={x + 12}
              y={y - (flat ? 46 : 64)}
              size={30}
              strokeWidth={1.3}
              color={active ? '#315c48' : '#839683'}
              aria-hidden="true"
            />
            <text
              className="s-node-step"
              x={x + 54}
              y={y - (flat ? 25 : 43)}
              fill={active ? '#315c48' : '#839683'}
              fontSize="11"
            >
              {labels.step} {formatChapterNumber(index)}
            </text>
            {!flat && (
              <>
                <path
                  d={`M${x} ${y}l30 -21h184l-30 21Z`}
                  fill={node.color}
                  stroke={active ? '#517a5e' : '#adbfac'}
                />
                <path
                  d={`M${x + 184} ${y}l30 -21v92l-30 21Z`}
                  fill={node.color}
                  stroke={active ? '#517a5e' : '#adbfac'}
                  className="s-node-side"
                />
              </>
            )}
            <rect
              className="s-node-face"
              x={x}
              y={y}
              width="184"
              height="92"
              fill={active ? '#dce9d4' : '#f7faf3'}
              stroke={active ? '#315c48' : '#adbfac'}
              strokeWidth={active ? 2.2 : 1.2}
            />
            <foreignObject x={x + 16} y={y + 13} width="152" height="48" aria-hidden="true">
              <div className="s-node-title">{node.name}</div>
            </foreignObject>
            <text x={x + 16} y={y + 78} fill="#657969" fontSize="10" fontFamily="monospace">
              {node.english}
            </text>
            <circle
              className={active ? 's-node-spark' : ''}
              cx={x + 170}
              cy={y + 75}
              r="3.1"
              fill={active ? '#416e52' : '#c1ceba'}
            />
          </g>
        );
      })}
    </svg>
  );
}
