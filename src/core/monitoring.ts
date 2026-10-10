import type { Data, Value } from './types';

export const record = (value: Value | undefined): Data =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
export const records = (value: Value | undefined): Data[] =>
  Array.isArray(value)
    ? (value
        .slice(0, 256)
        .filter(
          (item) => item !== null && typeof item === 'object' && !Array.isArray(item),
        ) as Data[])
    : [];
export const number = (value: Value | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const sum = (items: Data[], key: string) =>
  items.reduce((total, item) => total + number(item[key]), 0);
const mean = (items: Data[], key: string) =>
  items.length ? Math.round(sum(items, key) / items.length) : 0;

// A predictable empty selection keeps streamed and filtered views renderable.
const emptySelection: Data = {
  id: '',
  name: '暂无匹配设备',
  category: '',
  model: '',
  rack: '',
  status: 'unknown',
  power: 0,
  inlet: 0,
  metrics: [],
  history: { '最近 15 分钟': [], '最近 1 小时': [], '最近 6 小时': [] },
  trendTitle: '暂无历史数据',
  trendUnit: '',
  ports: [],
  gpus: [],
  alerts: [],
  temperature: 0,
  utilization: 0,
  memoryUsed: 0,
  memoryTotal: 0,
  rx: 0,
  tx: 0,
  crc: 0,
  peer: '—',
  speed: 0,
  label: '未选择端口',
};

export const monitoringHelpers: Record<string, (...args: Value[]) => Value> = {
  filterDevices: (devices, rack, category, onlyAlerts) =>
    records(devices).filter(
      (device) =>
        device.rack === rack &&
        (category === '全部设备' || device.category === category) &&
        (!onlyAlerts || records(device.alerts).length > 0),
    ),
  selectItem: (items, id) => {
    const list = records(items);
    return list.find((item) => item.id === id) ?? list[0] ?? emptySelection;
  },
  itemIds: (items) => records(items).map((item) => item.id ?? ''),
  fleetStats: (devices) => {
    const list = records(devices);
    return {
      count: list.length,
      power: Math.round(sum(list, 'power') / 100) / 10,
      alerts: list.reduce((total, item) => total + records(item.alerts).length, 0),
      gpus: list.reduce((total, item) => total + records(item.gpus).length, 0),
      inlet: mean(list, 'inlet'),
    };
  },
  alertsFor: (devices) =>
    records(devices)
      .flatMap((device) => records(device.alerts))
      .slice(0, 64),
  filterGpus: (devices, threshold, onlyHot) =>
    records(devices)
      .flatMap((device) => records(device.gpus))
      .slice(0, 256)
      .filter((gpu) => !onlyHot || number(gpu.temperature) >= number(threshold)),
  gpuStats: (devices, threshold) => {
    const cards = records(devices)
      .flatMap((device) => records(device.gpus))
      .slice(0, 256);
    return {
      count: cards.length,
      utilization: mean(cards, 'utilization'),
      memory: Math.round((sum(cards, 'memoryUsed') / Math.max(1, sum(cards, 'memoryTotal'))) * 100),
      hot: cards.filter((gpu) => number(gpu.temperature) >= number(threshold)).length,
      power: Math.round(sum(cards, 'power') / 100) / 10,
    };
  },
  portStats: (ports) => {
    const list = records(ports);
    return {
      up: list.filter((port) => port.status === 'healthy' || port.status === 'warning').length,
      down: list.filter((port) => port.status === 'critical').length,
      rx: Math.round(sum(list, 'rx') * 10) / 10,
      tx: Math.round(sum(list, 'tx') * 10) / 10,
      crc: sum(list, 'crc'),
    };
  },
};
