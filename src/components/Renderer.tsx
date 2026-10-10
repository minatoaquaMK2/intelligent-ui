import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { useId, type CSSProperties, type ReactNode } from 'react';
import type { Data, RenderTree, Value } from '../core/types';
import { AlertList, DeviceDetail, GpuGrid, PortGrid, RackView, Trend } from './Monitoring';

const string = (value: Value | undefined, fallback = '') =>
  value == null ? fallback : String(value);
const numeric = (value: Value | undefined, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const token = (value: Value | undefined, fallback = 4) =>
  Math.max(0, Math.min(8, numeric(value, fallback))) * 4;
const rich = (value: Value | undefined): ReactNode =>
  string(value)
    .split(/(\*\*.*?\*\*)/g)
    .map((part, index) =>
      part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );

function Chart({ props }: { props: Data }) {
  const values = (Array.isArray(props.values) ? props.values : [])
    .slice(0, 24)
    .map((value) => Math.max(0, numeric(value) * numeric(props.multiplier, 1)));
  const labels = Array.isArray(props.labels) ? props.labels : [];
  const max = Math.max(...values, 1);
  return (
    <figure className="ui-chart">
      <figcaption>
        {string(props.title, '数据图表')}
        <span>
          <i />
          当前情景
        </span>
      </figcaption>
      <div
        className="chart-plot"
        role="img"
        aria-label={values
          .map(
            (value, i) =>
              `${string(labels[i], String(i + 1))}：${Math.round(value)}${string(props.suffix)}`,
          )
          .join('；')}
      >
        <div className="chart-grid">
          <span>{Math.round(max).toLocaleString()}</span>
          <span>{Math.round(max / 2).toLocaleString()}</span>
          <span>0</span>
        </div>
        <div className="chart-bars">
          {values.map((value, index) => (
            <div className="chart-column" key={index}>
              <div className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${(value / max) * 100}%` }}>
                  <span>{Math.round(value).toLocaleString()}</span>
                </div>
              </div>
              <span className="chart-label">{string(labels[index], String(index + 1))}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function Renderer({
  tree,
  dispatch,
  disabled,
}: {
  tree: RenderTree;
  dispatch: (handler: string, value?: Value) => void;
  disabled?: boolean;
}) {
  const instanceId = useId();
  const render = (id: string, depth = 0): ReactNode => {
    const node = tree.nodes[id];
    if (!node || depth > 28) return null;
    const p = node.props;
    const children = node.children.map((child) => render(child, depth + 1));
    const content = (
      <>
        {p.content != null ? rich(p.content) : null}
        {children}
      </>
    );
    const event = (key: string, value?: Value) => {
      if (typeof p[key] === 'string') dispatch(p[key], value);
    };
    switch (node.type) {
      case 'box':
        return (
          <section
            key={id}
            className={`ui-box ui-box-${string(p.variant, 'plain')}`}
            style={{ padding: token(p.padding, p.variant ? 5 : 0), gap: token(p.gap) }}
          >
            {content}
          </section>
        );
      case 'row':
        return (
          <div
            key={id}
            className={`ui-row ui-row-${string(p.align, 'start')}`}
            style={{ gap: token(p.gap, 3) }}
          >
            {content}
          </div>
        );
      case 'grid':
        return (
          <div
            key={id}
            className="ui-grid"
            style={
              {
                '--columns': Math.max(1, Math.min(3, numeric(p.columns, 2))),
                gap: token(p.gap),
              } as CSSProperties
            }
          >
            {content}
          </div>
        );
      case 'title':
        return (
          <h3 key={id} className={`ui-title ui-title-${string(p.size, 'md')}`}>
            {content}
          </h3>
        );
      case 'text':
        return (
          <span key={id} className="ui-text">
            {content}
          </span>
        );
      case 'caption':
        return (
          <small key={id} className="ui-caption">
            {content}
          </small>
        );
      case 'badge':
        return (
          <span key={id} className={`ui-badge ui-badge-${string(p.tone, 'gray')}`}>
            {p.tone === 'green' && <Check size={11} />}
            {content}
          </span>
        );
      case 'stat':
        return (
          <div key={id} className={`ui-stat ${p.accent ? 'ui-stat-accent' : ''}`}>
            <span className="stat-label">{string(p.label)}</span>
            <div className="stat-number">
              {string(p.value, '—')}
              <small>{string(p.suffix)}</small>
            </div>
            <span className="stat-hint">{string(p.hint)}</span>
          </div>
        );
      case 'slider': {
        const min = numeric(p.min, 0),
          max = Math.max(min, numeric(p.max, 100));
        const value = Math.min(max, Math.max(min, numeric(p.value, min)));
        const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;
        return (
          <div key={id} className="ui-slider">
            <label htmlFor={`${instanceId}-control-${id}`}>
              <span>{string(p.label)}</span>
              <output>
                {value}
                <small>{string(p.suffix)}</small>
              </output>
            </label>
            <input
              id={`${instanceId}-control-${id}`}
              aria-label={string(p.label, '调整数值')}
              type="range"
              min={min}
              max={max}
              step={Math.max(0.01, numeric(p.step, 1))}
              value={value}
              disabled={!p.onChange}
              onChange={(e) => event('onChange', Number(e.target.value))}
              style={{ '--range-fill': `${percent}%` } as CSSProperties}
            />
            <div className="range-scale">
              <span>
                {min} {string(p.suffix)}
              </span>
              <span>
                {max} {string(p.suffix)}
              </span>
            </div>
          </div>
        );
      }
      case 'toggle':
        return (
          <label key={id} className="ui-toggle">
            <span>
              <strong>{string(p.label)}</strong>
              <small>{string(p.hint)}</small>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label={string(p.label, '切换选项')}
              checked={!!p.value}
              disabled={!p.onChange}
              onChange={(e) => event('onChange', e.target.checked)}
            />
            <span className="toggle-track" aria-hidden="true">
              <span />
            </span>
          </label>
        );
      case 'select':
        return (
          <label key={id} className="ui-select">
            <span>{string(p.label)}</span>
            <div>
              <select
                aria-label={string(p.label, '选择选项')}
                value={string(p.value)}
                disabled={!p.onChange}
                onChange={(e) =>
                  event(
                    'onChange',
                    Array.isArray(p.options) ? p.options[e.target.selectedIndex] : e.target.value,
                  )
                }
              >
                {(Array.isArray(p.options) ? p.options : []).slice(0, 50).map((option) => (
                  <option key={string(option)} value={string(option)}>
                    {string(option)}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        );
      case 'chart':
        return <Chart key={id} props={p} />;
      case 'rack':
        return <RackView key={id} props={p} onSelect={(value) => event('onChange', value)} />;
      case 'device':
        return <DeviceDetail key={id} props={p} />;
      case 'trend':
        return <Trend key={id} props={p} />;
      case 'gpus':
        return <GpuGrid key={id} props={p} onSelect={(value) => event('onChange', value)} />;
      case 'ports':
        return <PortGrid key={id} props={p} onSelect={(value) => event('onChange', value)} />;
      case 'alerts':
        return <AlertList key={id} props={p} />;
      case 'table':
        return (
          <div className="ui-table-wrap" key={id}>
            <table>
              <thead>
                <tr>
                  {(Array.isArray(p.columns) ? p.columns : []).slice(0, 12).map((label, i) => (
                    <th key={i}>{string(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(p.rows) ? p.rows : []).slice(0, 100).map((row, i) => (
                  <tr key={i}>
                    {(Array.isArray(row) ? row : []).slice(0, 12).map((cell, j) => (
                      <td key={j}>{string(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'divider':
        return <hr key={id} className="ui-divider" />;
      case 'button':
        return (
          <button
            key={id}
            className={`ui-button ui-button-${string(p.variant, 'primary')}`}
            onClick={() => event('onClick')}
            disabled={disabled || !!p.disabled || !p.onClick}
          >
            {content}
            <ArrowUpRight size={16} />
          </button>
        );
      default:
        return null;
    }
  };
  return <div className="native-ui">{tree.roots.map((id) => render(id))}</div>;
}
