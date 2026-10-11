import type { Compilation, Data } from '../core/types';
import type { Language, LessonId } from '../i18n/types';

export type EvidenceScenario = 'rack' | 'gpu' | 'network';
export interface Experiment {
  source: string;
  snapshots: [Data, Data];
  stateKey: string;
  contextKey?: string;
  stream?: { base: string; phases: string[] };
}

// Small, deterministic fixtures keep the teaching surface readable. All calculations
// still pass through the same compiler, Worker and registered business components.
const cards: Data[] = [68, 86, 79, 89].map((temperature, i) => ({
  id: `GPU-A01-01:${i}`,
  label: `GPU ${i}`,
  name: `GPU ${i}`,
  host: 'GPU-A01-01',
  device: 'GPU-A01-01',
  model: 'GPU · 80 GB',
  temperature,
  utilization: [54, 97, 71, 93][i],
  memoryUsed: [32, 72, 51, 68][i],
  memoryTotal: 80,
  power: [230, 390, 310, 365][i],
  status: temperature >= 80 ? 'warning' : 'healthy',
}));
const ports = (id: string, degraded: boolean): Data[] =>
  Array.from({ length: 8 }, (_, i) => ({
    id: `${id}/eth1/${i + 1}`,
    label: `Ethernet1/${i + 1}`,
    number: i + 1,
    status: degraded && i === 6 ? 'critical' : degraded && i === 7 ? 'warning' : 'healthy',
    peer: i < 6 ? `GPU-${id.split('-')[1]}-01:${i % 4}` : `spine-${i - 5}`,
    speed: i < 6 ? 25 : 100,
    rx: degraded && i === 6 ? 0 : [4, 7, 10, 3, 8, 6, 42, 48][i],
    tx: degraded && i === 6 ? 0 : [3, 5, 8, 2, 6, 5, 31, 35][i],
    crc: degraded && i === 7 ? 128 : 0,
  }));
const devices: Data[] = ['A01', 'A02'].flatMap((rackCode) => {
  const rack = `Rack ${rackCode}`;
  const switches = ['A', 'B'].map((letter, i) => {
    const id = `TOR-${rackCode}-${letter}`;
    return {
      id,
      name: id,
      rack,
      category: '交换机',
      model: 'Dell PowerSwitch',
      u: 42 - i,
      units: 1,
      status: 'healthy',
      power: 286 + i * 12,
      inlet: 26,
      alerts: [],
      gpus: [],
      ports: ports(id, false),
    };
  });
  const gpuId = `GPU-${rackCode}-01`;
  return [
    ...switches,
    {
      id: gpuId,
      name: gpuId,
      rack,
      category: 'GPU 服务器',
      model: 'Dell PowerEdge · GPU',
      u: 24,
      units: 6,
      status: 'warning',
      power: 1860,
      inlet: 29,
      alerts: [{ id: `${gpuId}-hot`, title: 'GPU temperature alert', severity: 'warning' }],
      gpus: cards.map((card, i) => ({ ...card, id: `${gpuId}:${i}`, host: gpuId, device: gpuId })),
      ports: [],
    },
    {
      id: `PE-${rackCode}-01`,
      name: `PE-${rackCode}-01`,
      rack,
      category: '服务器',
      model: 'Dell PowerEdge',
      u: 12,
      units: 2,
      status: 'healthy',
      power: 420,
      inlet: 25,
      alerts: [],
      gpus: [],
      ports: [],
    },
  ];
});
export const businessSnapshotA: Data = { snapshot: 'A', racks: ['Rack A01', 'Rack A02'], devices };
export const businessSnapshotB: Data = {
  ...businessSnapshotA,
  snapshot: 'B',
  devices: devices.map((device) =>
    device.category === '交换机'
      ? { ...device, status: 'warning', ports: ports(String(device.id), true) }
      : { ...device, power: Number(device.power) + 120 },
  ),
};

const words = (lang: Language) => {
  const en = lang === 'en';
  return {
    rack: en ? 'Rack' : '机架',
    selected: en ? 'Selected device' : '当前设备',
    power: en ? 'Device power' : '设备功耗',
    onlyHot: en ? 'Only GPUs at or above 80°C' : '只看 ≥ 80°C 的 GPU',
    selectedGpu: en ? 'Selected GPU' : '当前 GPU',
    utilization: en ? 'GPU utilization' : 'GPU 利用率',
    switch: en ? 'Switch' : '交换机',
    receive: en ? 'Total receive rate' : '接收速率合计',
    down: en ? 'Links down' : '中断链路',
    crc: en ? 'CRC errors' : 'CRC 错误',
    action: en ? 'Analyze this link in the next turn' : '带着当前链路继续分析',
    safe: en ? 'Registered controls only' : '只使用已注册控件',
    catalog: en
      ? 'rack / stat / select → registered React components'
      : 'rack / stat / select → 已注册 React 组件',
    growing: en ? 'Checking rack uplinks' : '正在检查机架上联链路',
    complete: en
      ? 'Checking rack uplinks; the port panel is arriving next.'
      : '正在检查机架上联链路，端口面板正在生成。',
    proof: en ? 'Fixed business input · real runtime' : '固定业务输入 · 真实运行时',
  };
};
const rackDeclarations = `{@state rack = "Rack A01"}
{@state selected = "GPU-A01-01"}
{@derive devices = filterDevices(data.devices, rack, "全部设备", false)}
{@derive device = selectItem(devices, selected)}`;
const gpuDeclarations = `{@state onlyHot = false}
{@state selected = "GPU-A01-01:0"}
{@derive nodes = filterDevices(data.devices, "Rack A01", "GPU 服务器", false)}
{@derive cards = filterGpus(nodes, 80, onlyHot)}
{@derive gpu = selectItem(cards, selected)}`;
const networkDeclarations = `{@state rack = "Rack A01"}
{@state switchId = "TOR-A01-A"}
{@state portId = "TOR-A01-A/eth1/8"}
{@derive switches = filterDevices(data.devices, rack, "交换机", false)}
{@derive device = selectItem(switches, switchId)}
{@derive port = selectItem(device.ports, portId)}
{@derive summary = portStats(device.ports)}`;

export function getExperiment(
  lang: Language,
  lesson: LessonId,
  scenario: EvidenceScenario = 'rack',
): Experiment {
  const w = words(lang);
  const snapshots: [Data, Data] = [businessSnapshotA, businessSnapshotB];
  const rackSelect = `<select label="${w.rack}" options={data.racks} value={rack} onChange={setRack} />`;
  const rack = `<rack label={rack} devices={devices} value={device.id} onChange={setSelected} />`;
  const gpu = `<gpus cards={cards} threshold={80} value={gpu.id} onChange={setSelected} />`;
  const portGrid = `<ports ports={device.ports} value={port.id} onChange={setPortId} />`;
  const networkStats = `<grid columns={2}>
  <stat label="${w.receive}" value={summary.rx} suffix="Gbps" />
  <stat label="${w.crc}" value={summary.crc} />
</grid>`;
  if (lesson === 'pipeline')
    return {
      snapshots,
      stateKey: 'selected',
      contextKey: 'deviceId',
      source: `${rackDeclarations}
<caption>${w.catalog}</caption>
${rackSelect}
${rack}
<stat label="${w.selected}" value={device.id} hint={device.model} />
<stat label="${w.power}" value={device.power} suffix="W" />`,
    };
  if (lesson === 'state')
    return {
      snapshots,
      stateKey: 'selected',
      contextKey: 'gpuId',
      source: `${gpuDeclarations}
<toggle label="${w.onlyHot}" value={onlyHot} onChange={setOnlyHot} />
${gpu}
<stat label="${w.selectedGpu}" value={gpu.id} />
<stat label="${w.utilization}" value={gpu.utilization} suffix="%" />`,
    };
  if (lesson === 'streaming') {
    const base = `${networkDeclarations}\n${rackSelect}\n${networkStats}\n`;
    const longText = `${base}${w.complete}`;
    const partialTag = '\n<ports ports={device.ports} value={';
    return {
      snapshots,
      stateKey: 'rack',
      source: `${longText}\n${portGrid}`,
      stream: {
        base,
        phases: [
          `${base}${w.growing}`,
          longText,
          `${longText}${partialTag}`,
          `${longText}\n${portGrid}`,
        ],
      },
    };
  }
  if (lesson === 'data')
    return {
      snapshots,
      stateKey: 'portId',
      contextKey: 'portId',
      source: `${networkDeclarations}
<badge tone="green">${lang === 'en' ? 'External snapshot' : '外部数据快照'} {data.snapshot}</badge>
${portGrid}
${networkStats}
<stat label="${w.down}" value={summary.down} />
<text>{port.label}: {port.rx} Gbps · CRC {port.crc}</text>`,
    };
  if (lesson === 'boundary')
    return {
      snapshots,
      stateKey: 'rack',
      source: `${rackDeclarations}
<badge tone="green">${w.safe}</badge>
${rackSelect}
${rack}
<stat label="${w.power}" value={device.power} suffix="W" />`,
    };
  if (lesson === 'action')
    return {
      snapshots,
      stateKey: 'portId',
      contextKey: 'portId',
      source: `${networkDeclarations}
${rackSelect}
<select label="${w.switch}" options={itemIds(switches)} value={device.id} onChange={setSwitchId} />
${portGrid}
<text>{rack} / {device.id} / {port.label}</text>
<button onClick={issueNewTurn("${lang === 'en' ? 'Analyze ' : '分析 '}" + rack + " / " + device.id + " / " + port.label + " · RX " + port.rx + " Gbps · CRC " + port.crc)}>${w.action}</button>`,
    };
  const evidenceSources = {
    rack: `${rackDeclarations}\n${rackSelect}\n${rack}\n<stat label="${w.power}" value={device.power} suffix="W" />`,
    gpu: `${gpuDeclarations}\n${gpu}\n<stat label="${w.utilization}" value={gpu.utilization} suffix="%" />`,
    network: `${networkDeclarations}\n${portGrid}\n${networkStats}`,
  };
  return {
    snapshots,
    source: `${evidenceSources[scenario]}\n<caption>${w.proof}</caption>`,
    stateKey: scenario === 'network' ? 'portId' : 'selected',
    contextKey: scenario === 'rack' ? 'deviceId' : scenario === 'gpu' ? 'gpuId' : 'portId',
  };
}

export function classifyCompilation(
  previous: Compilation | undefined,
  next: Compilation,
): 'program' | 'constants' | 'source' {
  if (JSON.stringify(previous?.program) !== JSON.stringify(next.program)) return 'program';
  if (JSON.stringify(previous?.constants) !== JSON.stringify(next.constants)) return 'constants';
  return 'source';
}

export function getBoundarySource(source: string, variant: number): string {
  return variant === 1
    ? `${source}\n<remoteShell command="reboot rack" />`
    : variant === 2
      ? `${source}\n<text>{window.location.href}</text>`
      : source;
}
