import { records } from '../src/core/monitoring';
import type { ViewContext } from '../src/core/context';
import { appData } from './telemetry';
export { appData } from './telemetry';

export type Scenario = 'rack' | 'gpu' | 'network';

export function detectScenario(prompt: string, previous?: Scenario): Scenario {
  // Explicit overview requests take priority when they also mention GPUs and switches.
  if (/机架总览|机架监控|rack overview|整体|所有设备/i.test(prompt)) return 'rack';
  if (/交换机|链路|端口|网络|network|switch|TOR-/i.test(prompt)) return 'network';
  if (/gpu|显存|算力|训练|温度阈值/i.test(prompt)) return 'gpu';
  if (/机架|rack|服务器|private cloud|私有云|PowerEdge|PE-/i.test(prompt)) return 'rack';
  return previous ?? 'rack';
}

export function exampleSource(scenario: Scenario, prompt = '', context: ViewContext = {}): string {
  const explicitRack = prompt.match(/A0[12]/i)?.[0]?.toUpperCase();
  const rack = explicitRack ? `Rack ${explicitRack}` : String(context.rack ?? 'Rack A01');
  const code = rack.slice(-3);
  const devices = records(appData.devices);
  const explicitDevice = devices.find((device) => prompt.includes(String(device.id)));
  const requested =
    explicitDevice ??
    devices.find((device) => device.id === context.deviceId && device.rack === rack);
  const range =
    ['最近 15 分钟', '最近 1 小时', '最近 6 小时'].find((value) => prompt.includes(value)) ??
    context.range ??
    '最近 15 分钟';
  const timestamp = '<caption>模拟遥测 · 2026-10-10 14:32:00 UTC+8 · 固定快照</caption>';
  if (scenario === 'gpu') {
    const threshold = Math.max(
      60,
      Math.min(
        95,
        Number(prompt.match(/(?:阈值\s*[:：]?\s*)(\d+)/)?.[1] ?? context.threshold ?? 80),
      ),
    );
    const cards = devices.flatMap((device) => records(device.gpus));
    const selected =
      cards.find((card) => prompt.includes(String(card.id)))?.id ??
      (!explicitDevice
        ? cards.find((card) => card.id === context.gpuId && String(card.host).includes(code))?.id
        : undefined) ??
      `${requested?.category === 'GPU 服务器' ? requested.id : `GPU-${code}-01`}:2`;
    return `## GPU 算力与热状态
查看每张 GPU 的利用率、显存和温度。调整阈值，定位需要关注的计算节点。
{@state rack = "${rack}"}
{@state threshold = ${threshold}}
{@state onlyHot = ${context.onlyHot === true && !/全部|所有/.test(prompt)}}
{@state selected = "${selected}"}
{@state range = "${range}"}
{@derive nodes = filterDevices(data.devices, rack, "GPU 服务器", false)}
{@derive cards = filterGpus(nodes, threshold, onlyHot)}
{@derive summary = gpuStats(nodes, threshold)}
{@derive gpu = selectItem(cards, selected)}
<box variant="surface" padding={6} gap={5}>
  <row align="between"><badge tone="purple">GPU TELEMETRY</badge>${timestamp}</row>
  <grid columns={2} gap={4}>
    <select label="选择机架" options={data.racks} value={rack} onChange={setRack} />
    <select label="历史时窗" options={data.ranges} value={range} onChange={setRange} />
  </grid>
  <grid columns={3} gap={3}>
    <stat label="GPU 平均利用率" value={summary.utilization} suffix="%" hint={summary.count + " 张 GPU · 当前机架"} accent={true} />
    <stat label="显存占用率" value={summary.memory} suffix="%" hint="按显存总容量加权" />
    <stat label="温度越限" value={summary.hot} suffix="张" hint={"温度 ≥ " + threshold + "°C"} />
  </grid>
  <slider label="GPU 温度告警阈值" min={60} max={95} step={1} value={threshold} suffix="°C" onChange={setThreshold} />
  <toggle label="只看温度越限 GPU" hint="阈值仅用于本地分析，不修改设备配置" value={onlyHot} onChange={setOnlyHot} />
  <gpus cards={cards} threshold={threshold} value={gpu.id} onChange={setSelected} />
  <trend title={gpu.id + " · 温度趋势"} values={gpu.history[range]} labels={data.labels[range]} suffix="°C" threshold={threshold} />
  <button variant="primary" disabled={gpu.id === ""} onClick={issueNewTurn("继续分析 GPU " + gpu.id + "，" + rack + "，温度阈值 " + threshold + "°C，当前温度 " + gpu.temperature + "°C")}>带着当前 GPU 继续分析</button>
  <caption>点击卡片切换趋势。温度曲线为预置历史，阈值不是硬件厂商推荐值。</caption>
</box>`;
  }
  if (scenario === 'network') {
    const id = requested?.category === '交换机' ? requested.id : `TOR-${code}-B`;
    const priorPort = String(context.portId ?? '').startsWith(`${id}/eth1/`)
      ? String(context.portId).split('/').at(-1)
      : undefined;
    const portNumber = Math.max(
      1,
      Math.min(48, Number(prompt.match(/Ethernet1\/(\d+)/i)?.[1] ?? priorPort ?? 48)),
    );
    return `## 交换机与链路健康
从 ToR 交换机下钻到端口，关联流量、链路状态与错误计数。
{@state rack = "${rack}"}
{@state switchId = "${id}"}
{@state portId = "${id}/eth1/${portNumber}"}
{@state range = "${range}"}
{@derive switches = filterDevices(data.devices, rack, "交换机", false)}
{@derive device = selectItem(switches, switchId)}
{@derive port = selectItem(device.ports, portId)}
{@derive summary = portStats(device.ports)}
<box variant="surface" padding={6} gap={5}>
  <row align="between"><badge tone="purple">NETWORK FABRIC</badge>${timestamp}</row>
  <grid columns={3} gap={3}>
    <select label="选择机架" options={data.racks} value={rack} onChange={setRack} />
    <select label="交换机" options={itemIds(switches)} value={device.id} onChange={setSwitchId} />
    <select label="历史时窗" options={data.ranges} value={range} onChange={setRange} />
  </grid>
  <grid columns={3} gap={3}>
    <stat label="活动端口" value={summary.up} suffix="/ 48" hint={summary.down + " 个预期链路中断"} accent={true} />
    <stat label="接收 / 发送流量" value={summary.rx + " / " + summary.tx} suffix="Gbps" hint="各端口速率之和 · 当前快照" />
    <stat label="CRC 错误" value={summary.crc} suffix="个" hint="最近 15 分钟计数" />
  </grid>
  <ports ports={device.ports} value={port.id} onChange={setPortId} />
  <box variant="highlight" padding={4} gap={3}>
    <row align="between"><title size="sm">{port.label}</title><badge tone="gray">{port.speed} Gbps</badge></row>
    <text>对端：{port.peer}</text>
    <row gap={5}><text>RX {port.rx} Gbps</text><text>TX {port.tx} Gbps</text><text>CRC {port.crc}</text></row>
  </box>
  <trend title={port.label + " · 接收流量"} values={port.history[range]} labels={data.labels[range]} suffix="Gbps" />
  <alerts items={alertsFor([device])} />
  <button variant="primary" onClick={issueNewTurn("继续分析交换机 " + device.id + " 的 " + port.label + " 链路，" + rack + "，CRC 错误 " + port.crc)}>分析当前交换机链路</button>
</box>`;
  }
  const id = requested?.id ?? `GPU-${code}-01`;
  return `## 机架运行总览
点选机架中的设备，查看服务器、交换机与 GPU 节点的运行指标。
{@state rack = "${rack}"}
{@state category = "${context.category ?? '全部设备'}"}
{@state onlyAlerts = ${context.onlyAlerts === true && !/全部|所有/.test(prompt)}}
{@state selected = "${id}"}
{@state range = "${range}"}
{@derive devices = filterDevices(data.devices, rack, category, onlyAlerts)}
{@derive summary = fleetStats(devices)}
{@derive device = selectItem(devices, selected)}
<box variant="surface" padding={6} gap={5}>
  <row align="between"><badge tone="purple">DELL PRIVATE CLOUD</badge>${timestamp}</row>
  <grid columns={3} gap={3}>
    <select label="选择机架" options={data.racks} value={rack} onChange={setRack} />
    <select label="设备类型" options={data.categories} value={category} onChange={setCategory} />
    <select label="历史时窗" options={data.ranges} value={range} onChange={setRange} />
  </grid>
  <grid columns={3} gap={3}>
    <stat label="当前设备" value={summary.count} suffix="台" hint={summary.gpus + " 张 GPU · 当前筛选范围"} accent={true} />
    <stat label="设备总功耗" value={summary.power} suffix="kW" hint="当前筛选设备功耗之和" />
    <stat label="活动告警" value={summary.alerts} suffix="条" hint={"平均进风 " + summary.inlet + "°C"} />
  </grid>
  <toggle label="只看告警设备" hint="保留物理 U 位，隐藏其余设备" value={onlyAlerts} onChange={setOnlyAlerts} />
  <grid columns={2} gap={5}>
    <rack label={rack} devices={devices} value={device.id} onChange={setSelected} />
    <box gap={4} padding={0}>
      <device device={device} />
      <trend title={device.trendTitle} values={device.history[range]} labels={data.labels[range]} suffix={device.trendUnit} />
    </box>
  </grid>
  <alerts items={alertsFor(devices)} />
  <button variant="primary" disabled={device.id === ""} onClick={issueNewTurn("继续分析 " + device.id + " " + device.category + "，" + rack + "，功耗 " + device.power + " W，进风温度 " + device.inlet + "°C")}>带着当前设备继续分析</button>
  <caption>设备布局、硬件配置与遥测均为演示数据；不代表 Dell 验证配置，尚未接入实际基础设施。</caption>
</box>`;
}
