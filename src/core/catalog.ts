export type PropRule =
  'string' | 'number' | 'boolean' | 'array' | 'object' | 'value' | 'handler' | readonly string[];

export const catalog: Record<string, Record<string, PropRule>> = {
  box: { variant: ['plain', 'surface', 'highlight'], padding: 'number', gap: 'number' },
  row: { align: ['start', 'center', 'between'], gap: 'number' },
  grid: { columns: 'number', gap: 'number' },
  title: { size: ['sm', 'md', 'lg'], content: 'value' },
  text: { content: 'value' },
  caption: { content: 'value' },
  badge: { tone: ['purple', 'green', 'gray', 'amber'], content: 'value' },
  stat: { label: 'string', value: 'value', suffix: 'string', hint: 'string', accent: 'boolean' },
  slider: {
    label: 'string',
    min: 'number',
    max: 'number',
    step: 'number',
    value: 'number',
    suffix: 'string',
    onChange: 'handler',
  },
  toggle: { label: 'string', hint: 'string', value: 'boolean', onChange: 'handler' },
  select: { label: 'string', options: 'array', value: 'value', onChange: 'handler' },
  chart: {
    title: 'string',
    values: 'array',
    labels: 'array',
    multiplier: 'number',
    suffix: 'string',
  },
  table: { columns: 'array', rows: 'array' },
  divider: {},
  button: {
    variant: ['primary', 'secondary'],
    onClick: 'handler',
    content: 'value',
    disabled: 'boolean',
  },
  rack: { label: 'string', devices: 'array', value: 'string', onChange: 'handler' },
  device: { device: 'object' },
  trend: {
    title: 'string',
    values: 'array',
    labels: 'array',
    suffix: 'string',
    threshold: 'number',
  },
  gpus: { cards: 'array', threshold: 'number', value: 'string', onChange: 'handler' },
  ports: { ports: 'array', value: 'string', onChange: 'handler' },
  alerts: { items: 'array' },
};

export function isAllowedValue(rule: PropRule, value: unknown): boolean {
  if (Array.isArray(rule)) return rule.includes(value as string);
  if (rule === 'value')
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
  if (rule === 'array') return Array.isArray(value);
  if (rule === 'object')
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (rule === 'handler') return typeof value === 'string' && value.startsWith('fn:');
  if (rule === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === rule;
}
