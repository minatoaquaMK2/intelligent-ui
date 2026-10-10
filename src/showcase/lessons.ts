import { catalog } from '../core/catalog';

export const REPO = 'https://github.com/minatoaquaMK2/intelligent-ui';
export const sourceLink = (file: string) => `${REPO}/blob/main/${file}`;
export const COMPONENT_COUNT = Object.keys(catalog).length;

export const lessons = [
  {
    id: 'pipeline',
    short: '全链路',
    name: '一句话，经过了哪几层？',
    eyebrow: 'FROM WORDS TO INTERFACES',
    node: 0,
    description:
      '模型描述界面，编译器整理结构，Worker 计算状态，宿主绘制组件。先看清各层的职责，再打开中间产物。',
    takeaway: '模型负责描述；运行时负责计算；宿主负责显示。',
    experiment: '拆开同一份界面的三种形态',
    instruction:
      '切换「DSL 源码」「编译产物」和「UI 操作」，观察右侧界面是怎样被描述、计算和绘制的。',
  },
  {
    id: 'state',
    short: '本地状态',
    name: '拖动滑块，模型还在工作吗？',
    eyebrow: 'GENERATE ONCE, INTERACT LOCALLY',
    node: 2,
    description:
      '控件把处理器 ID 和新值交给 Worker。Worker 更新状态、重新计算，再把变化的属性送回宿主。这一次交互无需调用模型。',
    takeaway: '局部交互在浏览器内闭环，状态按稳定名称保存。',
    experiment: '改一个状态，看看发生了什么',
    instruction:
      '拖动温度阈值，再点「重新编译」。观察 threshold 和越限数量：同一运行时会保留你已经调整的状态。',
  },
  {
    id: 'streaming',
    short: '流式编译',
    name: '代码没写完，界面怎么先出现？',
    eyebrow: 'INCOMPLETE SOURCE, USEFUL UI',
    node: 1,
    description:
      '编译器不断解析累计源码。完整结构进入程序，文字进入常量表，未完成标签产生恢复诊断。有效部分可以先显示。',
    takeaway: '流式容错保留已经有效的部分，界面不必等待整段输出结束。',
    experiment: '把源码停在一个尚未完成的标签上',
    instruction:
      '依次比较文字增长、未完成标签和完整组件。也可以播放一次逐段编译，观察诊断和编译产物的变化。',
  },
  {
    id: 'data',
    short: '数据绑定',
    name: '界面的数值一定由模型生成吗？',
    eyebrow: 'STRUCTURE AND DATA, SEPARATELY',
    node: 4,
    description:
      'DSL 用 data.* 引用业务字段。appData 独立进入运行时，模型无需把所有数值重新写进界面描述。',
    takeaway: '同一份程序可以接收不同数据，结构与数值各司其职。',
    experiment: '换一份数据，不换一份程序',
    instruction:
      '切换模拟快照 A / B。源码不变，Worker 使用新的 appData 重算结果；你调整过的阈值也会保留。',
  },
  {
    id: 'boundary',
    short: '执行边界',
    name: '为什么不直接执行生成的代码？',
    eyebrow: 'A SMALL LANGUAGE, EXPLICIT RULES',
    node: 1,
    description:
      '这份 POC 采用组件目录和表达式白名单。源码编译成 IR，Worker 解释 AST；未授权的组件、属性和全局访问会被拒绝。',
    takeaway: 'Worker 负责隔离执行线程；真正的能力边界来自受限解释器。',
    experiment: '尝试一段不被允许的表达式',
    instruction:
      '对比合法表达式、未知组件和全局访问。查看真实编译诊断，以及仍然可以显示的有效组件。',
  },
  {
    id: 'action',
    short: '下一轮对话',
    name: '当前选择，如何进入下一轮？',
    eyebrow: 'MAKE CONTEXT EXPLICIT',
    node: 3,
    description:
      '本地状态留在 Worker。要进入下一轮，宿主必须显式传递：可以把值写入 issueNewTurn 消息，也可以序列化为受控 context。',
    takeaway: '上下文由宿主明确携带，模型不会直接读取 Worker 的状态。',
    experiment: '把选择变成一条可以发送的消息',
    instruction:
      '先调整阈值，再点界面中的「带着当前状态继续」。检查生成的 action 文本，然后继续调整阈值，比较两者的区别。',
  },
] as const;

export type LessonId = (typeof lessons)[number]['id'];

export const stages = [
  {
    name: '生成描述',
    english: 'DSL SOURCE',
    role: '模型 / 演示模板',
    color: '#dce9d8',
    file: 'server/provider.ts',
    detail: '输出文字、状态声明与受限组件标签。在线实验使用确定性模板；本地版可接入模型。',
    code: '{@state threshold = 80}\n<slider value={threshold}\n  onChange={setThreshold} />',
  },
  {
    name: '编译结构',
    english: 'COMPILER',
    role: '累计源码 → IR',
    color: '#d5e5e8',
    file: 'src/core/compiler.ts',
    detail:
      '解析累计源码，校验组件与属性，输出程序、常量表和诊断。这里的 IR 是 JSON 结构，不是任意 JavaScript。',
    code: '{\n  program: { states, roots },\n  constants: { … },\n  diagnostics: []\n}',
  },
  {
    name: '计算与状态',
    english: 'WEB WORKER',
    role: '受限 AST 解释器',
    color: '#e5def2',
    file: 'src/core/runtime.ts',
    detail: '加载程序和独立数据，保存稳定状态，执行受控事件，并比较新旧组件树。Worker 不访问 DOM。',
    code: 'EVENT { handler, value }\n       ↓\nstate.threshold = 85\n       ↓\noperations: [{ op: "SET", … }]',
  },
  {
    name: '原生界面',
    english: 'REACT HOST',
    role: '操作 → 组件',
    color: '#eee3ca',
    file: 'src/components/Renderer.tsx',
    detail: `宿主应用 UI 操作，用 ${COMPONENT_COUNT} 种已注册组件绘制界面。事件携带处理器 ID 返回 Worker，动作由宿主处理。`,
    code: 'CREATE  添加节点\nSET     更新属性\nPLACE   调整子节点\nROOT    更新根顺序\nREMOVE  移除节点',
  },
  {
    name: '独立数据',
    english: 'APP DATA',
    role: '数据提供层',
    color: '#d9e8e1',
    file: 'server/telemetry.ts',
    detail: '数据提供层单独传入 appData。POC 中为固定模拟遥测；实际业务接入点与界面描述分离。',
    code: 'appData = {\n  temperatures: [68, 79, 86],\n  names: ["GPU 0", …]\n}',
  },
] as const;

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

export const streamBase = `{@state threshold = 80}\n<stat label="已生成的内容" value="温度分析" />\n`;
export const streamSources = [
  streamBase + '这是正在增长的说明文字。',
  streamBase + '这是正在增长的说明文字。\n<slider label="温度阈值" value={',
  streamBase +
    '这是正在增长的说明文字。\n<slider label="温度阈值" min={60} max={95} value={threshold} suffix="°C" onChange={setThreshold} />',
];
