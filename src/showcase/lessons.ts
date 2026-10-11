import { catalog } from '../core/catalog';
import type { Language, LessonId, LessonTranslation, StageTranslation } from '../i18n/types';
export type { LessonId };

export const REPO = 'https://github.com/minatoaquaMK2/intelligent-ui';
export const sourceLink = (file: string) => `${REPO}/blob/main/${file}`;
export const COMPONENT_COUNT = Object.keys(catalog).length;

const lessonsZh: LessonTranslation[] = [
  {
    id: 'pipeline',
    short: '全链路',
    name: '一句话，经过了哪几层？',
    eyebrow: 'FROM WORDS TO INTERFACES',
    description:
      '模型输出 DSL 描述界面，编译器整理校验结构，Worker 在沙箱中计算状态与数据，宿主 React 负责最终渲染。先认清分层边界，再深入各层中间产物。',
    takeaway: '模型负责声明结构；运行时负责状态计算；宿主负责安全渲染。',
    experiment: '从机架描述到可点选的设备图',
    instruction:
      '切换机架并点选服务器或 GPU 节点，查看设备功耗；再对照 DSL、编译产物与 Worker 操作，追踪 rack / select / stat 如何经过组件白名单变成原生界面。',
  },
  {
    id: 'state',
    short: '本地交互',
    name: '点选 GPU，模型还在工作吗？',
    eyebrow: 'GENERATE ONCE, INTERACT LOCALLY',
    description:
      '控件把处理器 ID 和变更值提交给 Worker。Worker 在浏览器内更新状态、重算表达式，再将组件属性的变化同步回宿主。这条本地交互路径无需再次生成源码或调用模型。',
    takeaway: '局部交互完全在浏览器沙箱内闭环，状态按声明名称稳定隔离。',
    experiment: 'GPU 卡片选择与本地筛选闭环',
    instruction:
      '点选 GPU 3，打开「只看 ≥ 80°C 的 GPU」，再点击「重新编译 · 保留状态」。检查 selected、onlyHot 与 SET 操作：筛选和卡片选择在同一 Worker 内保留，模型请求始终为 0。',
  },
  {
    id: 'streaming',
    short: '流式生成',
    name: '代码没写完，界面怎么先出现？',
    eyebrow: 'INCOMPLETE SOURCE, USEFUL UI',
    description:
      '每次收到片段，容错编译器都会重新编译当前累计源码，再比较前后产物。结构变化时更新 program，只有文字增长时更新 constants；未完成标签产生恢复诊断，有效部分先显示。流式传输补丁不等于增量解析。',
    takeaway: '流式容错机制保留可用片段，用户无需等待漫长的模型生成结束。',
    experiment: '逐步生成机架的网络端口面板',
    instruction:
      '先把机架切到 Rack A02，再比较说明开头、文字增长、未完成标签和完整端口面板。检查 constants / program 更新、恢复诊断与 rack 状态；播放时可暂停并从当前源码继续。',
  },
  {
    id: 'data',
    short: '数据直达',
    name: '界面的数值一定由模型生成吗？',
    eyebrow: 'STRUCTURE AND DATA, SEPARATELY',
    description:
      'DSL 中通过 data.* 表达式引用数据。appData 独立传入运行时，更新快照时无需改写源码或重新调用模型。数值直接来自数据源，减少让模型转抄数据的错误。',
    takeaway: '同一份 UI 程序可以复用于多份动态数据，结构抽象与数据实体完全解耦。',
    experiment: '网络快照变化，端口程序保持不变',
    instruction:
      '点选端口 8，再切换正常与故障快照。端口 7 变为中断、端口 8 出现 128 个 CRC 错误，聚合速率随之更新；DSL 和编译程序不变，当前端口选择保留。',
  },
  {
    id: 'boundary',
    short: '两种路线',
    name: '为什么不直接执行生成的代码？',
    eyebrow: 'A SMALL LANGUAGE, EXPLICIT RULES',
    description:
      '本项目采用严格的组件白名单与安全表达式沙箱。源码编译为 JSON IR，由 Worker 解释受控 AST。任何未注册组件、非法属性或全局对象（window / document）访问均被坚决拦截。',
    takeaway: 'Web Worker 隔离了执行线程，而真正的安全边界来自于受限的语法和白名单。',
    experiment: '机架原生控件的执行边界',
    instruction:
      '使用合法的机架选择控件，再尝试未注册的 remoteShell 与 window 访问。对照编译诊断，确认合法机架图仍可点选；这里运行原生组件路线，网页路线只是图解中的机制对照。',
  },
  {
    id: 'action',
    short: '下一轮对话',
    name: '当前选择，如何进入下一轮？',
    eyebrow: 'MAKE CONTEXT EXPLICIT',
    description:
      '点选设备和端口不会自动开始对话。点击按钮后，Worker 根据当前状态生成 issueNewTurn(text)，交给宿主处理。完整 POC 再由宿主提交新消息和经过校验的上下文，生成一条新回复；下方实验只捕获动作，不调用模型。',
    takeaway: '对话上下文由宿主受控显式携带，模型并不直接透传 Worker 的原始内部状态。',
    experiment: '把机架、交换机和端口带入下一轮',
    instruction:
      '选择 Rack A02、另一台交换机和任意端口，然后点击「带着当前链路继续分析」。对照捕获的消息和 context 中的 rack / deviceId / portId；只捕获显式 Action，不发送新请求。',
  },
  {
    id: 'evidence',
    short: '证据边界',
    name: '哪些能亲手验证，哪些还不能？',
    eyebrow: 'EVIDENCE AND LIMITS',
    description:
      '区分可检查的实现、真实运行的机制与模拟输入。实验可以验证编译、Worker、本地状态和数据更新；预置模板与遥测快照不能证明模型生成质量、真实机房数据或生产隔离强度。',
    takeaway: '观察实际产物和状态变化，再把结论限定在实验确实验证的范围内。',
    experiment: '分别验证机架、GPU 与网络运行记录',
    instruction:
      '依次打开机架设备、GPU 卡片和网络端口案例，并在每个案例中点选业务控件。只有收到真实 Worker 结果并完成事件后才标记验证通过；切换案例会新建运行时，记录跨案例保留。',
  },
];

const lessonsEn: LessonTranslation[] = [
  {
    id: 'pipeline',
    short: 'Pipeline',
    name: 'From a single prompt, what layers are involved?',
    eyebrow: 'FROM WORDS TO INTERFACES',
    description:
      'The model emits DSL describing the UI, the compiler structures IR, the Worker sandbox evaluates state and data, and React renders the components. Understand the role of each layer before diving into artifacts.',
    takeaway: 'The model declares structure; the runtime computes state; the host renders safely.',
    experiment: 'Trace a Rack Description into Selectable Devices',
    instruction:
      'Choose a rack and select a server or GPU node to inspect its power. Compare DSL, compiled IR and Worker operations to see registered rack / select / stat components become a native interface.',
  },
  {
    id: 'state',
    short: 'Local Interaction',
    name: 'When selecting a GPU, is the model still running?',
    eyebrow: 'GENERATE ONCE, INTERACT LOCALLY',
    description:
      'The UI control sends a handler ID and updated value to the Worker. It updates state, re-evaluates expressions, and returns changed component props locally in the browser. This path neither regenerates source nor calls the model.',
    takeaway:
      'Local interactions close the loop inside the browser sandbox; state persists under stable identifiers.',
    experiment: 'Select and Filter GPU Cards Locally',
    instruction:
      'Select GPU 3, enable the ≥80°C-only filter, then click "Recompile · Keep State". Inspect selected, onlyHot and SET operations: the same Worker keeps your choices with zero model calls.',
  },
  {
    id: 'streaming',
    short: 'Streaming',
    name: 'How does the UI render before code finishes writing?',
    eyebrow: 'INCOMPLETE SOURCE, USEFUL UI',
    description:
      'Each incoming chunk triggers a fresh compilation of the accumulated source. Comparing outputs determines whether program, constants, or only recovery diagnostics changed. Valid content appears before the source is complete. Streaming patches do not imply incremental parsing.',
    takeaway:
      'Streaming fault-tolerance preserves usable subtrees so users never wait for stream completion.',
    experiment: 'Stream a Rack’s Network Port Panel',
    instruction:
      'Choose Rack A02 first, then compare opening text, growing text, an incomplete tag and the finished port panel. Inspect constants / program updates, recovery diagnostics and retained rack state. Playback can pause and resume from the current source.',
  },
  {
    id: 'data',
    short: 'Direct Data',
    name: 'Must all interface values be generated by the model?',
    eyebrow: 'STRUCTURE AND DATA, SEPARATELY',
    description:
      'The DSL references data.* fields supplied independently as appData. Updating the snapshot does not change the source or call the model. Values come from the data feed, reducing errors from having the model copy them.',
    takeaway:
      'The same compiled UI program binds to distinct datasets—separating UI topology from data feeds.',
    experiment: 'Update Network Telemetry with the Same Program',
    instruction:
      'Select port 8, then switch between healthy and degraded snapshots. Port 7 goes down and port 8 reports 128 CRC errors; aggregate receive rate changes. DSL and program stay identical, and your port selection survives.',
  },
  {
    id: 'boundary',
    short: 'Two Routes',
    name: 'Why not just eval() the generated code?',
    eyebrow: 'A SMALL LANGUAGE, EXPLICIT RULES',
    description:
      'This architecture enforces a strict component whitelist and a sandboxed expression engine. Code compiles into a JSON IR evaluated by an AST interpreter in a Worker. Unauthorized components, prototype access, or globals like window/document are strictly rejected.',
    takeaway:
      'Workers isolate the execution thread, but the true security perimeter is defined by restricted grammar and schemas.',
    experiment: 'Validate Native Rack Controls at the Boundary',
    instruction:
      'Use registered rack controls, then try an unregistered remoteShell or access to window. Compiler diagnostics reject them while the rack remains interactive. This lab runs the native route; the diagram’s web route is conceptual.',
  },
  {
    id: 'action',
    short: 'Next Turn',
    name: 'How does current interaction feed into the next turn?',
    eyebrow: 'MAKE CONTEXT EXPLICIT',
    description:
      'Selecting devices and ports does not start a conversation. A button event asks the Worker to build issueNewTurn(text) from current state and return it to the host. The full POC submits a new message with validated context and creates a new response; this lab only captures the action, without calling a model.',
    takeaway:
      'Context is explicitly forwarded by the host; the model never has unvetted access to Worker state.',
    experiment: 'Carry Rack, Switch and Port into the Next Turn',
    instruction:
      'Choose Rack A02, another switch and a port, then click "Analyze this link in the next turn". Compare the captured message and rack / deviceId / portId context. This captures an explicit Action without sending a request.',
  },
  {
    id: 'evidence',
    short: 'Evidence & Limits',
    name: 'What can we verify, and what remains untested?',
    eyebrow: 'EVIDENCE AND LIMITS',
    description:
      'Separate inspectable implementation, real execution, and simulated inputs. Labs verify compilation, Workers, local state and data updates. Presets and telemetry snapshots do not establish model quality, real hardware data or production isolation.',
    takeaway:
      'Inspect actual artifacts and state changes, then limit conclusions to what the experiment verifies.',
    experiment: 'Verify Rack, GPU and Network Execution Separately',
    instruction:
      'Open each rack, GPU and network case and select a business control. A case is verified only after actual Worker results and an event arrive. Switching cases creates a fresh runtime while the cross-case verification record stays visible.',
  },
];

export const lessons = lessonsZh;

export function getLessons(lang: Language): LessonTranslation[] {
  return lang === 'en' ? lessonsEn : lessonsZh;
}

const stagesZh: StageTranslation[] = [
  {
    id: 'source',
    name: '生成描述',
    english: 'DSL SOURCE',
    role: '模型 / 演示模板',
    color: '#dce9d8',
    file: 'server/provider.ts',
    detail: '输出文字、状态声明与受限组件标签。在线实验使用确定性模板；本地版可接入真实大模型。',
    code: '{@state threshold = 80}\n<slider value={threshold}\n  onChange={setThreshold} />',
  },
  {
    id: 'compiler',
    name: '编译结构',
    english: 'COMPILER',
    role: '累计源码 → IR',
    color: '#d5e5e8',
    file: 'src/core/compiler.ts',
    detail:
      '解析累计源码，校验组件与属性白名单，输出程序 AST、常量表和诊断。IR 是纯 JSON 结构，杜绝任意执行。',
    code: '{\n  program: { states, roots },\n  constants: { … },\n  diagnostics: []\n}',
  },
  {
    id: 'runtime',
    name: '计算与状态',
    english: 'WEB WORKER',
    role: '受限 AST 解释器',
    color: '#e5def2',
    file: 'src/core/runtime.ts',
    detail:
      '加载程序和独立数据，保存稳定状态，执行受控事件并计算组件树 Diff 差量。Worker 无法访问宿主 DOM。',
    code: 'EVENT { handler, value }\n       ↓\nstate.threshold = 85\n       ↓\noperations: [{ op: "SET", … }]',
  },
  {
    id: 'host',
    name: '原生界面',
    english: 'REACT HOST',
    role: '操作 → 组件渲染',
    color: '#eee3ca',
    file: 'src/components/Renderer.tsx',
    detail: `宿主消费 UI 操作，用 ${COMPONENT_COUNT} 种已注册类型化组件绘制界面。事件携带处理器 ID 返回 Worker，动作由宿主处理。`,
    code: 'CREATE  添加节点\nSET     更新属性\nPLACE   调整子节点\nROOT    更新根顺序\nREMOVE  移除节点',
  },
  {
    id: 'data',
    name: '独立数据',
    english: 'APP DATA',
    role: '解耦数据流',
    color: '#d9e8e1',
    file: 'server/telemetry.ts',
    detail:
      '业务数据流独立传入 appData。POC 中使用确定性遥测数据；实际业务接入点与界面描述彻底解耦。',
    code: 'appData = {\n  temperatures: [68, 79, 86],\n  names: ["GPU 0", …]\n}',
  },
];

const stagesEn: StageTranslation[] = [
  {
    id: 'source',
    name: 'Source Gen',
    english: 'DSL SOURCE',
    role: 'Model / Demo Templates',
    color: '#dce9d8',
    file: 'server/provider.ts',
    detail:
      'Emits text, state declarations, and restricted component tags. The online lab uses deterministic templates; the local app supports real models.',
    code: '{@state threshold = 80}\n<slider value={threshold}\n  onChange={setThreshold} />',
  },
  {
    id: 'compiler',
    name: 'Compile IR',
    english: 'COMPILER',
    role: 'Cumulative Source → IR',
    color: '#d5e5e8',
    file: 'src/core/compiler.ts',
    detail:
      'Parses accumulated source, validates components/props against safe schemas, and outputs program AST, constants, and diagnostics. Pure JSON, no arbitrary scripts.',
    code: '{\n  program: { states, roots },\n  constants: { … },\n  diagnostics: []\n}',
  },
  {
    id: 'runtime',
    name: 'State & Eval',
    english: 'WEB WORKER',
    role: 'Sandboxed AST Evaluator',
    color: '#e5def2',
    file: 'src/core/runtime.ts',
    detail:
      'Loads program and app data, holds stable state, evaluates safe event handlers, and diffs the component tree. The Worker has no direct DOM access.',
    code: 'EVENT { handler, value }\n       ↓\nstate.threshold = 85\n       ↓\noperations: [{ op: "SET", … }]',
  },
  {
    id: 'host',
    name: 'React Host',
    english: 'REACT HOST',
    role: 'UI Ops → Components',
    color: '#eee3ca',
    file: 'src/components/Renderer.tsx',
    detail: `The host applies incremental UI ops, rendering with ${COMPONENT_COUNT} registered safe components. User events route back to Worker; actions trigger host callbacks.`,
    code: 'CREATE  Add node\nSET     Update prop\nPLACE   Reorder child\nROOT    Update roots\nREMOVE  Remove node',
  },
  {
    id: 'data',
    name: 'App Data',
    english: 'APP DATA',
    role: 'Decoupled Data Lane',
    color: '#d9e8e1',
    file: 'server/telemetry.ts',
    detail:
      'Business telemetry is injected separately into runtime. The model never needs to inline raw datasets, keeping structure and data clean and decoupled.',
    code: 'appData = {\n  temperatures: [68, 79, 86],\n  names: ["GPU 0", …]\n}',
  },
];

export const stages = stagesZh;

export function getStages(lang: Language): StageTranslation[] {
  return lang === 'en' ? stagesEn : stagesZh;
}

export const fixtureA = { temperatures: [68, 79, 86], names: ['GPU 0', 'GPU 1', 'GPU 2'] };
export const fixtureB = { temperatures: [83, 88, 92], names: ['GPU 0', 'GPU 1', 'GPU 2'] };

export const labSource = `{@state threshold = 80}
{@derive hot = (data.temperatures[0] >= threshold ? 1 : 0) + (data.temperatures[1] >= threshold ? 1 : 0) + (data.temperatures[2] >= threshold ? 1 : 0)}

<box variant="surface" padding={5} gap={4}>
  <badge tone="green">可交互的计算结果</badge>
  <stat label="温度越限" value={hot} suffix="/ 3 台" hint={"当前阈值 ≥ " + threshold + "°C"} />
  <slider label="温度阈值" min={60} max={95} value={threshold} suffix="°C" onChange={setThreshold} />
  <text>采样：{data.temperatures[0]}°C · {data.temperatures[1]}°C · {data.temperatures[2]}°C</text>
  <button onClick={issueNewTurn("分析 " + hot + " 台温度 ≥ " + threshold + "°C 的设备")}>带着当前状态继续</button>
</box>`;

export const labSourceEn = `{@state threshold = 80}
{@derive hot = (data.temperatures[0] >= threshold ? 1 : 0) + (data.temperatures[1] >= threshold ? 1 : 0) + (data.temperatures[2] >= threshold ? 1 : 0)}

<box variant="surface" padding={5} gap={4}>
  <badge tone="green">Interactive Derived Metric</badge>
  <stat label="Over-temp Nodes" value={hot} suffix="/ 3 units" hint={"Current threshold ≥ " + threshold + "°C"} />
  <slider label="Threshold" min={60} max={95} value={threshold} suffix="°C" onChange={setThreshold} />
  <text>Samples: {data.temperatures[0]}°C · {data.temperatures[1]}°C · {data.temperatures[2]}°C</text>
  <button onClick={issueNewTurn("Analyze " + hot + " units with temp ≥ " + threshold + "°C")}>Continue with Current State</button>
</box>`;

export function getLabSource(lang: Language): string {
  return lang === 'en' ? labSourceEn : labSource;
}

export const streamBase = `{@state threshold = 80}\n<stat label="已生成的内容" value="温度分析" />\n`;
export const streamBaseEn = `{@state threshold = 80}\n<stat label="Generated Content" value="Temp Analysis" />\n`;

export const streamSources = [
  streamBase + '这是正在增长的说明文字。',
  streamBase + '这是正在增长的说明文字。\n<slider label="温度阈值" value={',
  streamBase +
    '这是正在增长的说明文字。\n<slider label="温度阈值" min={60} max={95} value={threshold} suffix="°C" onChange={setThreshold} />',
];

export const streamSourcesEn = [
  streamBaseEn + 'This is growing explanation text.',
  streamBaseEn + 'This is growing explanation text.\n<slider label="Threshold" value={',
  streamBaseEn +
    'This is growing explanation text.\n<slider label="Threshold" min={60} max={95} value={threshold} suffix="°C" onChange={setThreshold} />',
];

export function getStreamSources(lang: Language): string[] {
  return lang === 'en' ? streamSourcesEn : streamSources;
}

export function getStreamBase(lang: Language): string {
  return lang === 'en' ? streamBaseEn : streamBase;
}
