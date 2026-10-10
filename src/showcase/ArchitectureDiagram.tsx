import { useId } from 'react';
import type { LessonTranslation, StageId, StageTranslation, Translations } from '../i18n/types';
import {
  architectureFlows,
  isStageInLesson,
  lessonArchitecture,
  type FlowId,
} from './architecture';

const positions: Record<StageId, [number, number]> = {
  source: [32, 118],
  compiler: [268, 118],
  runtime: [504, 118],
  host: [740, 118],
  data: [280, 343],
};

export function ArchitectureDiagram({
  lesson,
  chapterNumber,
  selected,
  onSelect,
  flat,
  animated,
  stages,
  labels,
}: {
  lesson: LessonTranslation;
  chapterNumber: string;
  selected: StageId;
  onSelect: (stage: StageId) => void;
  flat: boolean;
  animated: boolean;
  stages: StageTranslation[];
  labels: Translations['diagram'];
}) {
  const id = useId().replace(/:/g, '');
  const mechanism = lessonArchitecture[lesson.id];
  const focus = stages.find((stage) => stage.id === mechanism.focus)!;
  const heading = `${chapterNumber} / ${lesson.short}`;
  const summary = labels.pathDescriptions[lesson.id];
  const edge = flat ? 180 : 206;
  const top = flat ? 110 : 88;
  const paths: Record<FlowId, { d: string; label: string; x: number; y: number }> = {
    source: { d: `M ${32 + edge + 8} 170 H 259`, label: labels.dsl, x: 248, y: 154 },
    compilation: { d: `M ${268 + edge + 8} 170 H 495`, label: labels.ir, x: 484, y: 154 },
    operations: { d: `M ${504 + edge + 8} 170 H 731`, label: labels.uiOps, x: 720, y: 154 },
    data: {
      d: `M ${280 + edge + 8} 381 H 560 V 241`,
      label: labels.dataFeed,
      x: 574,
      y: 370,
    },
    event: {
      d: 'M 850 241 V 273 H 655 V 241',
      label: labels.handlerId,
      x: 752,
      y: 293,
    },
    action: {
      d: 'M 610 241 V 319 H 890 V 241',
      label: labels.explicitAction,
      x: 750,
      y: 339,
    },
    nextTurn: {
      d: `M 850 ${top} V 53 H 180 V ${top}`,
      label: labels.nextTurn,
      x: 515,
      y: 36,
    },
  };

  return (
    <>
      <div className="s-diagram-heading">
        <h3>{heading}</h3>
        <span>
          {labels.focusPrefix}
          {focus.name}
        </span>
      </div>
      <svg
        className="s-architecture-svg"
        viewBox={lesson.id === 'action' ? '0 0 976 436' : '0 70 976 366'}
        role="group"
        aria-label={`${heading} — ${labels.ariaLabel}`}
        data-lesson={lesson.id}
        data-motion={animated ? 'playing' : 'paused'}
      >
        <title>{heading}</title>
        <desc>{summary}</desc>
        <defs>
          <pattern id={`${id}-dots`} width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#c9d2c8" />
          </pattern>
          {(['program', 'event'] as const).map((kind) => (
            <marker
              key={kind}
              id={`${id}-${kind}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path
                d="M1 1 9 5 1 9"
                fill="none"
                stroke={kind === 'program' ? '#628578' : '#b7805e'}
                strokeWidth="1.7"
              />
            </marker>
          ))}
        </defs>
        <rect width="976" height="436" fill={`url(#${id}-dots)`} />
        {(Object.keys(architectureFlows) as FlowId[]).map((flowId) => {
          if ((flowId === 'action' || flowId === 'nextTurn') && lesson.id !== 'action') return null;
          const flow = architectureFlows[flowId];
          const path = paths[flowId];
          const relevant = mechanism.flows.includes(flowId);
          const color = flow.kind === 'program' ? '#628578' : '#b7805e';
          return (
            <g key={flowId} className={`s-diagram-flow ${relevant ? 'is-relevant' : 'is-muted'}`}>
              <path
                className={`s-flow ${relevant ? 'is-flowing' : ''}`}
                data-flow={flowId}
                data-from={flow.from}
                data-to={flow.to}
                d={path.d}
                fill="none"
                stroke={color}
                strokeWidth={relevant ? 2 : 1.4}
                markerEnd={`url(#${id}-${flow.kind})`}
              />
              <text
                className="s-svg-micro s-flow-label"
                x={path.x}
                y={path.y}
                textAnchor={flowId === 'data' ? 'start' : 'middle'}
                fill={color}
              >
                {path.label}
              </text>
            </g>
          );
        })}
        {stages.map((stage) => {
          const [x, y] = positions[stage.id];
          const height = stage.id === 'data' ? 68 : 115;
          const active = stage.id === selected;
          const relevant = isStageInLesson(lesson.id, stage.id);
          return (
            <g
              key={stage.id}
              className={`s-diagram-node ${active ? 'is-active' : ''} ${relevant ? 'is-relevant' : 'is-muted'}`}
              data-stage={stage.id}
              role="button"
              tabIndex={0}
              aria-label={`${stage.name}：${stage.role}`}
              aria-pressed={active}
              onClick={() => onSelect(stage.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(stage.id);
                }
              }}
            >
              {!flat && (
                <>
                  <path d={`M${x} ${y}l26 -20h180l-26 20Z`} fill={stage.color} stroke="#a8b8ad" />
                  <path
                    d={`M${x + 180} ${y}l26 -20v${height}l-26 20Z`}
                    fill={active ? '#85ac99' : '#c7d2c7'}
                    stroke="#a8b8ad"
                  />
                </>
              )}
              <rect
                className="s-node-face"
                x={x}
                y={y}
                width="180"
                height={height}
                fill={active ? '#294f45' : relevant ? stage.color : '#f9faf6'}
                stroke={active ? '#294f45' : '#9dab9e'}
                strokeWidth={active ? 2 : 1.2}
              />
              <text
                x={x + 17}
                y={y + 29}
                fill={active ? '#f2f5e9' : '#2d4b41'}
                fontSize="16"
                fontWeight="600"
              >
                {stage.name}
              </text>
              <circle cx={x + 160} cy={y + 25} r="3.1" fill={active ? '#d2ef93' : '#a6b9ac'} />
              <text
                className="s-svg-micro"
                x={x + 17}
                y={y + 49}
                fill={active ? '#c1d6c7' : '#78877b'}
              >
                {stage.english}
              </text>
              {stage.id !== 'data' && (
                <>
                  <line
                    x1={x + 17}
                    y1={y + 67}
                    x2={x + 163}
                    y2={y + 67}
                    stroke={active ? '#547368' : '#dbe2d9'}
                  />
                  <text x={x + 17} y={y + 91} fill={active ? '#e2eade' : '#647368'} fontSize="11">
                    {stage.role}
                  </text>
                </>
              )}
              <text className="s-svg-micro" x={x} y={y - (flat ? 12 : 32)} fill="#557367">
                {stage.id === 'data' ? labels.dataLane : labels.execLayer}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="s-diagram-explanation">
        <p>{summary}</p>
        <span>{labels.note}</span>
      </div>
    </>
  );
}
