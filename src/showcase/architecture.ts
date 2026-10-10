import type { LessonId, StageId } from '../i18n/types';

export const formatChapterNumber = (index: number) => String(index + 1).padStart(2, '0');

export const architectureFlows = {
  source: { from: 'source', to: 'compiler', kind: 'program' },
  compilation: { from: 'compiler', to: 'runtime', kind: 'program' },
  operations: { from: 'runtime', to: 'host', kind: 'program' },
  data: { from: 'data', to: 'runtime', kind: 'program' },
  event: { from: 'host', to: 'runtime', kind: 'event' },
  action: { from: 'runtime', to: 'host', kind: 'event' },
  nextTurn: { from: 'host', to: 'source', kind: 'event' },
} as const satisfies Record<string, { from: StageId; to: StageId; kind: 'program' | 'event' }>;

export type FlowId = keyof typeof architectureFlows;

// Chapters are topics, not positions in the execution pipeline. Keep their
// semantic focus and paths independent of module order and translated copy.
export const lessonArchitecture: Record<LessonId, { focus: StageId; flows: FlowId[] }> = {
  pipeline: { focus: 'source', flows: ['source', 'compilation', 'operations', 'data'] },
  state: { focus: 'runtime', flows: ['event', 'operations'] },
  streaming: { focus: 'compiler', flows: ['source', 'compilation', 'operations'] },
  data: { focus: 'data', flows: ['data', 'operations'] },
  boundary: { focus: 'compiler', flows: ['source', 'compilation', 'operations'] },
  action: { focus: 'host', flows: ['event', 'action', 'nextTurn'] },
};

export function isStageInLesson(lesson: LessonId, stage: StageId): boolean {
  return lessonArchitecture[lesson].flows.some((id) => {
    const flow = architectureFlows[id];
    return flow.from === stage || flow.to === stage;
  });
}
