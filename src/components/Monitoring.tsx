import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Network,
  Server,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { number, record, records } from '../core/monitoring';
import type { Data, Value } from '../core/types';

const text = (value: Value | undefined, fallback = '') =>
  value == null ? fallback : String(value);
const statuses: Record<string, string> = {
  healthy: '正常',
  warning: '警告',
  critical: '严重',
  idle: '未使用',
  unknown: '未知',
};
const status = (value: Value | undefined) =>
  Object.hasOwn(statuses, text(value)) ? text(value) : 'unknown';
const DeviceIcon = ({ category, size = 18 }: { category: Value | undefined; size?: number }) =>
  category === '交换机' ? (
    <Network size={size} />
  ) : category === 'GPU 服务器' ? (
    <Cpu size={size} />
  ) : (
    <Server size={size} />
  );
const Badge = ({ value }: { value: Value | undefined }) => (
  <span className={`health-badge health-${status(value)}`}>
    <i />
    {statuses[status(value)]}
  </span>
);
type SelectionProps = { props: Data; onSelect: (id: string) => void };

export function RackView({ props, onSelect }: SelectionProps) {
  const devices = records(props.devices)
    .filter((device) => number(device.u) >= 1 && number(device.u) + number(device.units) <= 43)
    .sort((a, b) => number(b.u) - number(a.u));
  const segments: ReactNode[] = [];
  let cursor = 42;
  const gap = (top: number, bottom: number) => {
    if (top < bottom) return;
    segments.push(
      <div className="rack-slot rack-gap" key={`gap-${top}`}>
        <span className="rack-unit">{top === bottom ? top : `${top}–${bottom}`}</span>
        <div>
          <span>空闲 / 已筛选</span>
        </div>
      </div>,
    );
  };
  for (const device of devices) {
    const bottom = number(device.u),
      top = bottom + number(device.units) - 1;
    if (top > cursor) continue;
    gap(cursor, top + 1);
    segments.push(
      <div className="rack-slot" key={text(device.id)}>
        <span className="rack-unit">{top === bottom ? top : `${top}–${bottom}`}</span>
        <button
          type="button"
          className={`rack-device rack-${device.category === '交换机' ? 'switch' : device.category === 'GPU 服务器' ? 'gpu' : 'server'} health-${status(device.status)} ${props.value === device.id ? 'is-selected' : ''}`}
          aria-pressed={props.value === device.id}
          aria-label={`查看 ${text(device.id)}，${text(device.category)}，${statuses[status(device.status)]}`}
          disabled={!props.onChange}
          onClick={() => onSelect(text(device.id))}
        >
          <span className="rack-device-top">
            <DeviceIcon category={device.category} size={14} />
            <strong>{text(device.id)}</strong>
            <i className="device-led" />
          </span>
          <span className="rack-vents" aria-hidden="true">
            {Array.from({ length: device.category === '交换机' ? 16 : 8 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          {device.category === 'GPU 服务器' && (
            <span className="rack-device-note">PowerEdge · GPU compute</span>
          )}
        </button>
      </div>,
    );
    cursor = bottom - 1;
  }
  gap(cursor, 1);
  return (
    <div className="rack-view" role="group" aria-label={`${text(props.label)} 机架设备图`}>
      <div className="monitor-heading">
        <span>
          <Server size={16} />
          <strong>{text(props.label)}</strong>
        </span>
        <span>42U · 正面示意</span>
      </div>
      <div className="rack-cabinet">
        <div className="rack-topline">
          <span>U</span>
          <span>DELL PRIVATE CLOUD</span>
          <i />
        </div>
        {segments}
        <div className="rack-base">
          <i />
          <i />
        </div>
      </div>
      <div className="monitor-legend">
        <Badge value="healthy" />
        <Badge value="warning" />
        <Badge value="critical" />
      </div>
      {!devices.length && <p className="monitor-empty">没有匹配的设备，请调整筛选条件。</p>}
      <p className="monitor-footnote">点击设备查看指标 · U 位按顺序展示，间距为示意</p>
    </div>
  );
}

export function DeviceDetail({ props }: { props: Data }) {
  const device = record(props.device);
  if (!device.id)
    return (
      <div className="monitor-empty monitor-empty-panel">
        <Server size={28} />
        <p>当前筛选下没有设备</p>
        <small>关闭告警筛选或选择其他设备类型</small>
      </div>
    );
  return (
    <div className="device-detail" role="group" aria-label="所选设备详情">
      <div className="monitor-heading">
        <span>
          <DeviceIcon category={device.category} />
          <strong>设备详情</strong>
        </span>
        <Badge value={device.status} />
      </div>
      <h4>{text(device.id)}</h4>
      <p className="device-model">{text(device.model)}</p>
      <p className="device-role">{text(device.role)}</p>
      <div className="device-meta">
        <span>
          管理 IP <b>{text(device.management)}</b>
        </span>
        <span>
          位置{' '}
          <b>
            U{number(device.u)}–{number(device.u) + number(device.units) - 1}
          </b>
        </span>
      </div>
      <div className="device-metrics">
        {records(device.metrics)
          .slice(0, 6)
          .map((metric) => (
            <div className="device-metric" key={text(metric.label)}>
              <div>
                <span>{text(metric.label)}</span>
                <strong>
                  {number(metric.value)}
                  <small>{text(metric.unit)}</small>
                </strong>
              </div>
              <div className="meter-track">
                <i
                  style={{
                    width: `${Math.max(0, Math.min(100, (number(metric.value) / Math.max(1, number(metric.max))) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
      </div>
      <div className="device-environment">
        <span>
          <Thermometer size={13} />
          进风 {number(device.inlet)}°C
        </span>
        <span>
          <Zap size={13} />
          {number(device.power)} W
        </span>
      </div>
    </div>
  );
}

export function Trend({ props }: { props: Data }) {
  const id = useId();
  const values = (Array.isArray(props.values) ? props.values : []).slice(0, 100).map(number);
  const labels = Array.isArray(props.labels) ? props.labels : [];
  const threshold =
    typeof props.threshold === 'number' && Number.isFinite(props.threshold)
      ? Math.max(0, props.threshold)
      : undefined;
  const max = Math.ceil(Math.max(...values, threshold ?? 0, 10) / 10) * 10;
  const x = (i: number) => 38 + (i / Math.max(1, values.length - 1)) * 342;
  const y = (n: number) => 140 - (Math.max(0, n) / max) * 108;
  const line = values.map((value, i) => `${x(i)},${y(value)}`).join(' ');
  const gradient = `trend-${id.replace(/:/g, '')}`;
  return (
    <figure className="monitor-trend">
      <figcaption>
        <span>
          <Activity size={15} />
          {text(props.title, '指标趋势')}
        </span>
        <small>{text(props.suffix)}</small>
      </figcaption>
      {!values.length ? (
        <div className="trend-empty">当前筛选无历史数据</div>
      ) : (
        <>
          <svg
            viewBox="0 0 400 172"
            role="img"
            aria-label={values
              .map((v, i) => `${text(labels[i], String(i + 1))}：${v}${text(props.suffix)}`)
              .join('；')}
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0076ce" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0076ce" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1="38"
                  x2="380"
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  className="trend-gridline"
                />
                <text x="28" y={y(max * fraction) + 4} textAnchor="end" className="trend-axis">
                  {max * fraction}
                </text>
              </g>
            ))}
            <polygon
              points={`38,140 ${line} ${x(values.length - 1)},140`}
              fill={`url(#${gradient})`}
            />
            <polyline
              points={line}
              fill="none"
              stroke="#0076ce"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {threshold !== undefined && (
              <g>
                <line
                  x1="38"
                  x2="380"
                  y1={y(threshold)}
                  y2={y(threshold)}
                  className="trend-threshold"
                />
                <text
                  x="380"
                  y={Math.max(12, y(threshold) - 6)}
                  textAnchor="end"
                  className="threshold-label"
                >
                  阈值 {threshold}
                  {text(props.suffix)}
                </text>
              </g>
            )}
            {values.map((value, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(value)}
                r={i === values.length - 1 ? 4 : 2}
                fill="#0076ce"
              >
                <title>
                  {text(labels[i])} · {value}
                  {text(props.suffix)}
                </title>
              </circle>
            ))}
            {[0, Math.floor((values.length - 1) / 2), values.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y="164"
                  textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'}
                  className="trend-axis"
                >
                  {text(labels[i])}
                </text>
              ))}
          </svg>
          <div className="trend-caption">
            <span>
              <i />
              预置历史数据
            </span>
            <strong>
              最新 {values.at(-1)} {text(props.suffix)}
            </strong>
          </div>
        </>
      )}
    </figure>
  );
}

export function GpuGrid({ props, onSelect }: SelectionProps) {
  const cards = records(props.cards);
  if (!cards.length)
    return (
      <div className="monitor-empty monitor-empty-panel">
        <CheckCircle2 size={28} />
        <p>当前没有温度越限 GPU</p>
        <small>降低阈值或关闭筛选可查看所有 GPU</small>
      </div>
    );
  return (
    <div className="gpu-grid" aria-label="GPU 卡片列表">
      {cards.map((card) => {
        const hot = number(card.temperature) >= number(props.threshold);
        return (
          <button
            type="button"
            key={text(card.id)}
            className={`gpu-card ${hot ? 'gpu-hot' : ''} ${props.value === card.id ? 'is-selected' : ''}`}
            aria-pressed={props.value === card.id}
            aria-label={`查看 ${text(card.id)}，${number(card.temperature)}°C${hot ? '，温度越限' : ''}`}
            disabled={!props.onChange}
            onClick={() => onSelect(text(card.id))}
          >
            <div className="gpu-card-heading">
              <Cpu size={19} />
              <strong>{text(card.name)}</strong>
              <span className={hot ? 'gpu-hot-label' : ''}>{hot ? '越限' : '正常'}</span>
            </div>
            <span className="gpu-host">{text(card.host)}</span>
            <div className="gpu-util">
              <b>
                {number(card.utilization)}
                <small>%</small>
              </b>
              <span>GPU 利用率</span>
            </div>
            <div className="meter-track">
              <i style={{ width: `${Math.max(0, Math.min(100, number(card.utilization)))}%` }} />
            </div>
            <div className="gpu-measure">
              <span>显存</span>
              <strong>
                {number(card.memoryUsed)} / {number(card.memoryTotal)} GB
              </strong>
            </div>
            <div className="gpu-measure">
              <span>温度</span>
              <strong className={hot ? 'hot-value' : ''}>
                {number(card.temperature)} °C {hot && <AlertTriangle size={11} />}
              </strong>
            </div>
            <div className="gpu-measure">
              <span>功耗</span>
              <strong>{number(card.power)} W</strong>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function PortGrid({ props, onSelect }: SelectionProps) {
  const ports = records(props.ports).slice(0, 64);
  return (
    <div className="port-panel" role="group" aria-label="交换机端口面板">
      <div className="monitor-heading">
        <span>
          <Network size={17} />
          <strong>端口状态</strong>
        </span>
        <span>点击端口查看流量</span>
      </div>
      <div className="port-grid">
        {ports.map((port) => (
          <button
            type="button"
            key={text(port.id)}
            className={`port health-${status(port.status)} ${props.value === port.id ? 'is-selected' : ''}`}
            aria-pressed={props.value === port.id}
            aria-label={`${text(port.label)}，${statuses[status(port.status)]}，${text(port.peer)}`}
            disabled={!props.onChange}
            onClick={() => onSelect(text(port.id))}
            title={`${text(port.label)} · ${text(port.peer)}`}
          >
            <Network size={15} aria-hidden="true" />
            <span>{number(port.number)}</span>
          </button>
        ))}
      </div>
      <div className="monitor-legend">
        <Badge value="healthy" />
        <Badge value="warning" />
        <span className="health-badge health-critical">
          <i />
          链路 Down
        </span>
        <Badge value="idle" />
      </div>
      <p className="monitor-footnote">1–44 · 25 Gbps / 45–48 · 100 Gbps 上联 · 演示配置</p>
    </div>
  );
}

export function AlertList({ props }: { props: Data }) {
  const items = records(props.items).slice(0, 64);
  return (
    <div className="monitor-alerts" role="group" aria-label="活动告警列表">
      <div className="monitor-heading">
        <span>
          <AlertTriangle size={16} />
          <strong>活动告警</strong>
          <b className="alert-count">{items.length}</b>
        </span>
        <span>当前筛选范围</span>
      </div>
      {!items.length ? (
        <div className="alerts-clear">
          <CheckCircle2 size={17} />
          当前范围无活动告警
        </div>
      ) : (
        items.map((item) => (
          <article className={`monitor-alert health-${status(item.severity)}`} key={text(item.id)}>
            <AlertTriangle size={16} />
            <div>
              <div className="alert-title">
                <h4>{text(item.title)}</h4>
                <span>{text(item.time)}</span>
              </div>
              <p>{text(item.detail)}</p>
              <span className="alert-device">{text(item.device)}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
