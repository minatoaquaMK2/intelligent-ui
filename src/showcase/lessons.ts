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
    experiment: '拆开同一份界面的三种形态',
    instruction:
      '在「DSL 源码」「编译产物」与「状态 / 操作」之间切换，观察右侧界面是如何被描述、计算和增量绘制的。',
  },
  {
    id: 'state',
    short: '本地状态',
    name: '拖动滑块，模型还在工作吗？',
    eyebrow: 'GENERATE ONCE, INTERACT LOCALLY',
    description:
      '控件把处理器 ID 和变更值提交给 Worker。Worker 在浏览器内更新状态、重算表达式，再将组件属性的变化同步回宿主。这条本地交互路径无需再次生成源码或调用模型。',
    takeaway: '局部交互完全在浏览器沙箱内闭环，状态按声明名称稳定隔离。',
    experiment: '变更一个状态，观察运行时闭环',
    instruction:
      '拖动右侧的温度阈值滑块，然后点击「重新编译 · 保留状态」。观察 threshold 变量与越限计数：同一运行时会完整保留你刚刚调整的状态。',
  },
  {
    id: 'streaming',
    short: '流式编译',
    name: '代码没写完，界面怎么先出现？',
    eyebrow: 'INCOMPLETE SOURCE, USEFUL UI',
    description:
      '每次收到片段，容错编译器都会重新编译当前累计源码，再比较前后产物。结构变化时更新 program，只有文字增长时更新 constants；未完成标签产生恢复诊断，有效部分先显示。流式传输补丁不等于增量解析。',
    takeaway: '流式容错机制保留可用片段，用户无需等待漫长的模型生成结束。',
    experiment: '让源码停在未完成的标签上',
    instruction:
      '对比「文字增长」「未完成标签」与「完整组件」三种切片，也可以点击「播放流式编译」，观察诊断信息与产物的实时演进。',
  },
  {
    id: 'data',
    short: '数据绑定',
    name: '界面的数值一定由模型生成吗？',
    eyebrow: 'STRUCTURE AND DATA, SEPARATELY',
    description:
      'DSL 中通过 data.* 表达式引用数据。appData 独立传入运行时，更新快照时无需改写源码或重新调用模型。数值直接来自数据源，减少让模型转抄数据的错误。',
    takeaway: '同一份 UI 程序可以复用于多份动态数据，结构抽象与数据实体完全解耦。',
    experiment: '切换数据源，程序架构保持不变',
    instruction:
      '在「快照 A」和「快照 B」之间切换。源码无需变动，Worker 即可基于新数据重新派生指标，同时你设置的阈值依然得以保留。',
  },
  {
    id: 'boundary',
    short: '执行边界',
    name: '为什么不直接执行生成的代码？',
    eyebrow: 'A SMALL LANGUAGE, EXPLICIT RULES',
    description:
      '本项目采用严格的组件白名单与安全表达式沙箱。源码编译为 JSON IR，由 Worker 解释受控 AST。任何未注册组件、非法属性或全局对象（window / document）访问均被坚决拦截。',
    takeaway: 'Web Worker 隔离了执行线程，而真正的安全边界来自于受限的语法和白名单。',
    experiment: '注入一段越界或非法表达式',
    instruction:
      '依次查看「合法表达式」「未知组件」和「访问 window」。观察编译诊断的拦截提示，以及未受影响的有效组件如何安全渲染。',
  },
  {
    id: 'action',
    short: '下一轮对话',
    name: '当前选择，如何进入下一轮？',
    eyebrow: 'MAKE CONTEXT EXPLICIT',
    description:
      '滑块变化不会自动开始对话。点击按钮后，Worker 根据当前状态生成 issueNewTurn(text)，交给宿主处理。完整 POC 再由宿主提交新消息和经过校验的上下文，生成一条新回复；下方实验只捕获动作，不调用模型。',
    takeaway: '对话上下文由宿主受控显式携带，模型并不直接透传 Worker 的原始内部状态。',
    experiment: '将交互结果封装为下一轮消息',
    instruction:
      '调整滑块阈值，点击界面中的「带着当前状态继续」。查看下方捕获的 Action 文本如何带入当前阈值和越限台数；本实验不会发送新请求。',
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
    experiment: 'Deconstruct the Three Forms of a Single Interface',
    instruction:
      'Toggle between "DSL Source", "Compiled IR", and "State / Ops" to observe how the interface on the right is described, evaluated, and rendered.',
  },
  {
    id: 'state',
    short: 'Local State',
    name: 'When moving a slider, is the model still running?',
    eyebrow: 'GENERATE ONCE, INTERACT LOCALLY',
    description:
      'The UI control sends a handler ID and updated value to the Worker. It updates state, re-evaluates expressions, and returns changed component props locally in the browser. This path neither regenerates source nor calls the model.',
    takeaway:
      'Local interactions close the loop inside the browser sandbox; state persists under stable identifiers.',
    experiment: 'Change a State Variable & Observe the Local Loop',
    instruction:
      'Drag the temperature threshold slider on the right, then click "Recompile · Keep State". Observe threshold and alert count: the active runtime retains your state.',
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
    experiment: 'Pause Source on an Incomplete Tag',
    instruction:
      'Compare "Growing Text", "Incomplete Tag", and "Full Component", or hit "Play Streaming" to watch diagnostics and artifacts evolve live.',
  },
  {
    id: 'data',
    short: 'Data Binding',
    name: 'Must all interface values be generated by the model?',
    eyebrow: 'STRUCTURE AND DATA, SEPARATELY',
    description:
      'The DSL references data.* fields supplied independently as appData. Updating the snapshot does not change the source or call the model. Values come from the data feed, reducing errors from having the model copy them.',
    takeaway:
      'The same compiled UI program binds to distinct datasets—separating UI topology from data feeds.',
    experiment: 'Switch Data Feeds Without Changing the Program',
    instruction:
      'Toggle between Snapshot A and B. With unchanged source, the Worker re-evaluates derivations against new data while keeping your adjusted threshold intact.',
  },
  {
    id: 'boundary',
    short: 'Boundaries',
    name: 'Why not just eval() the generated code?',
    eyebrow: 'A SMALL LANGUAGE, EXPLICIT RULES',
    description:
      'This architecture enforces a strict component whitelist and a sandboxed expression engine. Code compiles into a JSON IR evaluated by an AST interpreter in a Worker. Unauthorized components, prototype access, or globals like window/document are strictly rejected.',
    takeaway:
      'Workers isolate the execution thread, but the true security perimeter is defined by restricted grammar and schemas.',
    experiment: 'Inject an Unauthorized Expression or Tag',
    instruction:
      'Compare "Valid Expression", "Unknown Component", and "Access window". Observe compiler diagnostics blocking risky nodes while safe neighbors continue rendering.',
  },
  {
    id: 'action',
    short: 'Next Turn',
    name: 'How does current interaction feed into the next turn?',
    eyebrow: 'MAKE CONTEXT EXPLICIT',
    description:
      'Moving a slider does not start a conversation. A button event asks the Worker to build issueNewTurn(text) from current state and return it to the host. The full POC submits a new message with validated context and creates a new response; this lab only captures the action, without calling a model.',
    takeaway:
      'Context is explicitly forwarded by the host; the model never has unvetted access to Worker state.',
    experiment: 'Package Current State as a Next-Turn Action',
    instruction:
      'Adjust the threshold slider, then click "Continue with Current State". Inspect how the captured Action text includes the current threshold and alert count. This lab does not send a new request.',
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
