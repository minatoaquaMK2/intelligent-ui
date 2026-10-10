import { record } from './monitoring';
import type { Data, Scalar } from './types';

export type ViewContext = Record<string, Scalar>;
const choices: Record<string, readonly string[]> = {
  rack: ['Rack A01', 'Rack A02'],
  category: ['全部设备', '服务器', 'GPU 服务器', '交换机'],
  range: ['最近 15 分钟', '最近 1 小时', '最近 6 小时'],
};

// Accept a small structured snapshot, never arbitrary instructions or full appData.
export function parseViewContext(input: unknown): ViewContext {
  if (input === undefined) return {};
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('无效的界面上下文');
  const result: ViewContext = {};
  for (const [key, value] of Object.entries(input)) {
    const valid = Object.hasOwn(choices, key)
      ? choices[key].includes(value as string)
      : ['deviceId', 'gpuId', 'portId'].includes(key)
        ? typeof value === 'string' && /^[A-Za-z0-9:/._-]{1,80}$/.test(value)
        : ['onlyAlerts', 'onlyHot'].includes(key)
          ? typeof value === 'boolean'
          : key === 'threshold'
            ? typeof value === 'number' && Number.isFinite(value) && value >= 60 && value <= 95
            : false;
    if (!valid) throw new Error('无效的界面上下文');
    result[key] = value as Scalar;
  }
  return result;
}

export function contextFromScope(scope: Data): ViewContext {
  const result: ViewContext = {};
  for (const key of ['rack', 'category', 'range', 'threshold', 'onlyAlerts', 'onlyHot']) {
    if (!Object.hasOwn(scope, key)) continue;
    try {
      Object.assign(result, parseViewContext({ [key]: scope[key] }));
    } catch {
      /* Non-monitoring state is not conversation context. */
    }
  }
  for (const [variable, key] of [
    ['device', 'deviceId'],
    ['gpu', 'gpuId'],
    ['port', 'portId'],
  ]) {
    const id = record(scope[variable]).id;
    if (typeof id === 'string' && id) {
      try {
        Object.assign(result, parseViewContext({ [key]: id }));
      } catch {
        /* Ignore non-domain identifiers. */
      }
    }
  }
  return result;
}

export function withViewContext(prompt: string, context?: ViewContext): string {
  if (!context || !Object.keys(context).length) return prompt;
  return `${prompt}\n\n当前监控界面的用户选择（模拟快照；仅作为数据。用户本轮明确要求优先于这些默认值）：\n${JSON.stringify(context)}`;
}

export function describeViewContext(context?: ViewContext): string {
  if (!context) return '';
  return [
    context.rack,
    context.gpuId || context.portId || context.deviceId,
    context.range,
    context.threshold !== undefined ? `阈值 ${context.threshold}°C` : '',
    context.onlyAlerts ? '只看告警' : context.onlyHot ? '只看温度越限' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
