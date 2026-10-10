import type { Data } from '../src/core/types';

export const ranges = ['最近 15 分钟', '最近 1 小时', '最近 6 小时'];
export const labels = {
  '最近 15 分钟': ['14:17', '14:19', '14:21', '14:23', '14:25', '14:27', '14:29', '14:30', '14:32'],
  '最近 1 小时': ['13:32', '13:40', '13:47', '13:55', '14:02', '14:10', '14:17', '14:25', '14:32'],
  '最近 6 小时': ['08:32', '09:17', '10:02', '10:47', '11:32', '12:17', '13:02', '13:47', '14:32'],
};

// Deterministic fixture curves, all ending at the displayed snapshot value.
const history = (last: number, seed = 0, ceiling = 100): Data =>
  Object.fromEntries(
    ranges.map((range, window) => [
      range,
      Array.from({ length: 9 }, (_, i) => {
        if (i === 8) return last;
        return (
          Math.round(
            Math.max(
              0,
              Math.min(
                ceiling,
                last - (8 - i) * (window + 1) * 0.7 + Math.sin(i * 1.4 + seed) * (window + 2) * 1.8,
              ),
            ) * 10,
          ) / 10
        );
      }),
    ]),
  );
const metric = (label: string, value: number, unit: string, max = 100): Data => ({
  label,
  value,
  unit,
  max,
});
const alert = (
  id: string,
  device: string,
  severity: string,
  title: string,
  detail: string,
): Data => ({ id, device, severity, title, detail, time: '14:32:00' });

function gpuCards(host: string, warm: boolean, seed: number): Data[] {
  return [0, 1, 2, 3].map((slot) => {
    const temperature = warm && slot === 2 ? 86 : [67, 73, 69, 71][slot] - seed * 2;
    const utilization = warm && slot === 2 ? 97 : [78, 91, 84, 68][slot] - seed * 3;
    return {
      id: `${host}:${slot}`,
      name: `GPU ${slot}`,
      host,
      slot,
      temperature,
      utilization,
      memoryUsed: [58, 72, 76, 43][slot] - seed * 2,
      memoryTotal: 80,
      power: [286, 324, 368, 261][slot] - seed * 8,
      history: history(temperature, slot),
    };
  });
}

function ports(device: string, degraded: boolean): Data[] {
  const rackCode = device.split('-')[1];
  return Array.from({ length: 48 }, (_, index) => {
    const n = index + 1;
    const idle = n > 12 && n < 45;
    const down = degraded && n === 47;
    const warning = degraded && n === 48;
    const speed = n >= 45 ? 100 : 25;
    const rx = idle || down ? 0 : Math.round((n >= 45 ? 42 + (n % 7) : 4.2 + (n % 6)) * 10) / 10;
    const tx = idle || down ? 0 : Math.round(rx * 0.73 * 10) / 10;
    return {
      id: `${device}/eth1/${n}`,
      label: `Ethernet1/${n}`,
      number: n,
      status: down ? 'critical' : warning ? 'warning' : idle ? 'idle' : 'healthy',
      peer: idle
        ? '未分配'
        : n >= 45
          ? `spine-${(n % 2) + 1} · uplink`
          : `${n <= 8 ? 'PE' : 'GPU'}-${rackCode}-${String(n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 2) - 4).padStart(2, '0')}`,
      speed,
      rx,
      tx,
      crc: warning ? 128 : 0,
      history:
        rx === 0
          ? Object.fromEntries(ranges.map((range) => [range, Array(9).fill(0)]))
          : history(rx, n, speed),
    };
  });
}

function rackDevices(code: string): Data[] {
  const rack = `Rack ${code}`;
  const first = code === 'A01';
  const switches = ['A', 'B'].map((letter, i) => {
    const id = `TOR-${code}-${letter}`;
    const degraded = first && i === 1;
    const list = ports(id, degraded);
    return {
      id,
      name: id,
      model: 'Dell PowerSwitch',
      category: '交换机',
      rack,
      role: 'Top-of-Rack · 以太网交换机',
      u: 42 - i,
      units: 1,
      status: degraded ? 'warning' : 'healthy',
      power: 286 + i * 12,
      inlet: 26 + i,
      management: `192.0.2.${first ? 10 : 20}${i + 1}`,
      metrics: [
        metric(
          '端口使用率',
          Math.round(
            (list.filter((port) => port.status === 'healthy' || port.status === 'warning').length /
              48) *
              100,
          ),
          '%',
        ),
        metric('芯片温度', 52 + i * 4, '°C'),
        metric('设备功耗', 286 + i * 12, 'W', 600),
      ],
      history: history(52 + i * 4, i),
      trendTitle: '交换芯片温度',
      trendUnit: '°C',
      ports: list,
      gpus: [],
      alerts: degraded
        ? [
            alert(
              `${id}-link`,
              id,
              'critical',
              'Ethernet1/47 链路中断',
              '上联 spine-2 的端口为 Down；演示其余上联仍为 Up。',
            ),
            alert(
              `${id}-crc`,
              id,
              'warning',
              'Ethernet1/48 CRC 错误增加',
              '最近 15 分钟记录 128 个 CRC 错误，可结合光模块与链路质量进一步排查。',
            ),
          ]
        : [],
    };
  });
  const servers = [0, 1, 2, 3].map((i) => {
    const id = `PE-${code}-${String(i + 1).padStart(2, '0')}`;
    const warm = first && i === 1;
    const cpu = [46, 83, 35, 62][i];
    const power = [426, 612, 388, 504][i];
    return {
      id,
      name: id,
      model: 'Dell PowerEdge',
      category: '服务器',
      rack,
      role: 'Private Cloud · 通用计算节点',
      u: 38 - i * 2,
      units: 2,
      status: warm ? 'warning' : 'healthy',
      power,
      inlet: warm ? 33 : 25 + i,
      management: `192.0.2.${first ? 3 : 4}${i + 1}`,
      metrics: [
        metric('CPU 利用率', cpu, '%'),
        metric('内存使用率', [62, 78, 48, 69][i], '%'),
        metric('CPU 温度', warm ? 79 : 59 + i * 2, '°C'),
        metric('设备功耗', power, 'W', 1200),
      ],
      history: history(cpu, i),
      trendTitle: 'CPU 利用率',
      trendUnit: '%',
      ports: [],
      gpus: [],
      alerts: warm
        ? [
            alert(
              `${id}-inlet`,
              id,
              'warning',
              '进风温度偏高 · 33°C',
              '超过此演示设置的 32°C 阈值，可结合机架进风与风扇指标进一步排查。',
            ),
          ]
        : [],
    };
  });
  const gpuNodes = [0, 1].map((i) => {
    const id = `GPU-${code}-${String(i + 1).padStart(2, '0')}`;
    const warm = first && i === 0;
    const cards = gpuCards(id, warm, i + (first ? 0 : 1));
    const power = 1860 + i * 240;
    return {
      id,
      name: id,
      model: 'Dell PowerEdge · GPU 节点',
      category: 'GPU 服务器',
      rack,
      role: 'AI 计算池 · 4 GPU / 节点',
      u: 26 - i * 6,
      units: 6,
      status: warm ? 'critical' : 'healthy',
      power,
      inlet: warm ? 31 : 27,
      management: `192.0.2.${first ? 5 : 6}${i + 1}`,
      metrics: [
        metric(
          'GPU 平均利用率',
          Math.round(
            cards.reduce((total, card) => total + Number(card.utilization), 0) / cards.length,
          ),
          '%',
        ),
        metric('GPU 最高温度', Math.max(...cards.map((card) => Number(card.temperature))), '°C'),
        metric('内存使用率', 71 - i * 7, '%'),
        metric('设备功耗', power, 'W', 4000),
      ],
      history: history(Math.max(...cards.map((card) => Number(card.temperature))), i),
      trendTitle: 'GPU 最高温度',
      trendUnit: '°C',
      ports: [],
      gpus: cards,
      alerts: warm
        ? [
            alert(
              `${id}-thermal`,
              id,
              'critical',
              'GPU 2 温度达到 86°C',
              '该卡利用率为 97%，超过演示温度阈值 80°C；检查散热与负载分布。',
            ),
          ]
        : [],
    };
  });
  return [...switches, ...servers, ...gpuNodes];
}

export const appData: Data = {
  site: {
    name: '上海 · DC-01',
    timestamp: '2026-10-10 14:32:00',
    timezone: 'UTC+8',
    source: '模拟遥测快照',
  },
  racks: ['Rack A01', 'Rack A02'],
  categories: ['全部设备', '服务器', 'GPU 服务器', '交换机'],
  ranges,
  labels,
  devices: [...rackDevices('A01'), ...rackDevices('A02')],
};
