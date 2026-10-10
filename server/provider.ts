import { setTimeout as delay } from 'node:timers/promises';
import { catalog } from '../src/core/catalog';
import { readSSE } from '../src/lib/sse';
import { appData, exampleSource, type Scenario } from './examples';
import { records } from '../src/core/monitoring';
import type { ViewContext } from '../src/core/context';

export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}
export const isConfigured = (config: ProviderConfig) =>
  !!(config.baseUrl && config.apiKey && config.model);

export async function* demoStream(
  scenario: Scenario,
  prompt: string,
  signal: AbortSignal,
  interval = 65,
  context: ViewContext = {},
) {
  const source = exampleSource(scenario, prompt, context);
  const chars = Array.from(source);
  for (let position = 0; position < chars.length; position += 38) {
    signal.throwIfAborted();
    yield chars.slice(position, position + 38).join('');
    if (interval) await delay(interval, undefined, { signal });
  }
}

// Give the model an inventory and schema, not hundreds of repeated historical samples.
const inventory = records(appData.devices).map(({ history, ports, gpus, ...device }) => ({
  ...device,
  portCount: records(ports).length,
  gpus: records(gpus).map(({ history, ...gpu }) => gpu),
}));
export const systemPrompt = `You generate Chinese interactive monitoring interfaces for a Dell Private Cloud themed POC using a small DIL-inspired language. Output only DSL, no code fences. Never output HTML, CSS, JavaScript, functions, loops, imports or React.
All data are simulated telemetry snapshots. Do not claim a live connection, official Dell UI, validated hardware configuration or successful physical operations. This UI is read-only; thresholds affect local analysis only.
Grammar:
- Prose and ## headings; tags from the component catalog; {expression} interpolation.
- Declare primitive state BEFORE components: {@state threshold = 80}. This creates setThreshold.
- Derive: {@derive devices = filterDevices(data.devices, rack, "全部设备", false)}.
- Allowed expressions: numbers, strings, booleans, null, arrays, state variables, data properties, arithmetic, comparisons, ternary, round(n), min(a,b), max(a,b), money(n), percent(n).
- Pure monitoring helpers: filterDevices(devices,rack,category,onlyAlerts); selectItem(items,id) picks matching id or first or a safe empty record; itemIds(items); fleetStats(devices) returns count,power(kW),alerts,gpus,inlet; alertsFor(devices); filterGpus(devices,threshold,onlyHot); gpuStats(devices,threshold) returns count,utilization,memory,hot,power; portStats(ports) returns up,down,rx,tx,crc. All filtering and aggregation run locally in the Worker.
- No methods, assignments, object literals, arrow functions or globals.
- Numeric/boolean/expression props use braces: min={60}. Strings use quotes: label="温度阈值".
- slider/toggle/select/rack/gpus/ports bind value and onChange to a state setter. select options must be scalar arrays. rack/gpus/ports values are ids from their data arrays. device receives the selected device object.
- button onClick={issueNewTurn("分析 GPU " + gpu.id + "，温度阈值 " + threshold)} or copy(text). Follow-up text must carry current selection, rack and relevant thresholds.
- trend uses number[] values, string[] labels, suffix and optional threshold. gpus displays per-card temperature/utilization/memory/power. ports displays link status. alerts takes array items.
- Reuse stable state names, at most 60 components. Do not invent data provenance. Label assumptions. Unknown requests may combine these native monitoring components.
Catalog: ${JSON.stringify(catalog)}
appData contract:
- data.site = ${JSON.stringify(appData.site)}
- data.racks = ${JSON.stringify(appData.racks)}, data.categories = ${JSON.stringify(appData.categories)}, data.ranges = ${JSON.stringify(appData.ranges)}
- data.labels[range] = time label array; data.devices is the complete inventory below. Each device additionally has history[range] (CPU % for servers, hottest GPU temperature for GPU nodes, chip temperature for switches), gpus[] and ports[].
- GPU objects include id,name,host,slot,temperature,utilization,memoryUsed,memoryTotal,power,history[range] (temperature).
- Port objects include id,label,number,status,peer,speed(Gbps),rx(Gbps),tx(Gbps),crc(count in last 15 minutes),history[range] (RX). Switches have 48 simulated ports; link down is critical, unused is idle. Port id format: TOR-A01-B/eth1/48.
- Device alerts[] include id,device,severity,title,detail,time. rack physical placement uses u (lowest occupied U), units. Real hardware specifications are not claimed.
Inventory summary (reference data.*, do not copy values): ${JSON.stringify(inventory)}
Complete example:
${exampleSource('rack')}
Follow-ups create a NEW response and independent state. Current UI values are available only when explicitly included in the user message.`;

export async function* modelStream(
  config: ProviderConfig,
  messages: HistoryMessage[],
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  if (!isConfigured(config))
    throw new Error('请在 .env 配置 LLM_BASE_URL、LLM_API_KEY 和 LLM_MODEL，然后重启服务。');
  const response = await fetcher(`${config.baseUrl!.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
    }),
  });
  // Do not expose provider bodies: gateways sometimes echo credentials in errors.
  if (!response.ok)
    throw new Error(`模型服务返回 HTTP ${response.status}，请检查服务端的 API 配置。`);
  if (!response.body) throw new Error('模型服务未返回响应流');
  let complete = false;
  let finishReason: string | null = null;
  for await (const data of readSSE(response.body)) {
    if (data === '[DONE]') {
      complete = true;
      break;
    }
    let chunk: {
      error?: unknown;
      choices?: { delta?: { content?: string; refusal?: string }; finish_reason?: string | null }[];
    };
    try {
      chunk = JSON.parse(data);
    } catch {
      throw new Error('模型服务返回了无效的 SSE 数据');
    }
    if (chunk.error) throw new Error('模型服务在生成过程中返回错误');
    const choice = chunk.choices?.[0];
    if (choice?.delta?.refusal) throw new Error('模型未能生成此界面，请调整描述后重试');
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    if (typeof choice?.delta?.content === 'string') yield choice.delta.content;
  }
  if (!complete && !finishReason) throw new Error('模型响应意外中断，请重试');
  if (finishReason && finishReason !== 'stop')
    throw new Error(`模型未完整生成界面（${finishReason}），请缩短描述后重试`);
}
