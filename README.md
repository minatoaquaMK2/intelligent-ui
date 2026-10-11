# Dell Private Cloud · Intelligent UI Lab

[机制教学页](https://minatoaquamk2.github.io/intelligent-ui/) · [在线试用 POC](https://minatoaquamk2.github.io/intelligent-ui/demo/) · [GitHub Pages 部署说明](docs/github-pages.md)

以 **Dell Private Cloud 机架监控** 为主题的生成式 UI POC，覆盖服务器、GPU、交换机及链路。参考 [OpenUI 的文章 How ChatGPT Intelligent UI works](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works)，用自己的受限 DSL 和 AST 解释器验证 **生成 → 编译 → Worker 执行 → React 渲染 → 本地交互** 的闭环。

这是独立实现，不是 ChatGPT 的源码，也不兼容完整 DIL。默认演示模式使用模板，不调用模型；配置兼容的模型服务后可使用真实生成。

## 在线机制实验室

GitHub Pages 首页以六组交互实验解释全链路、本地状态、流式编译、数据绑定、执行边界和下一轮对话。可点击 2.5D 架构图查看每一层，再检查实际的 DSL、IR、状态和 UI 操作。页面也嵌入了完整监控 POC。

公开试用使用浏览器内的模板和模拟遥测，运行真实编译器与 Worker，无需 API Key。它不连接实际设备或模型服务。本地运行保留真实模型接入能力。

```sh
npm run pages:dev      # 预览教学页：http://127.0.0.1:4175/intelligent-ui/
npm run pages:build    # 构建静态教学页与嵌入式试用
```

推送到 `main` 后，GitHub Actions 自动检查、构建并部署到 GitHub Pages。

## 复用为 Codex skill

[github-pages-explainer](skills/github-pages-explainer/SKILL.md) 将本站的分章叙事、交互机制图和业务实验方法整理为可复用 skill，包含独立的 React/TypeScript 图解组件、页面骨架、搜索示例，以及浏览器验收和 GitHub Pages 发布流程。章节与实验根据目标项目的真实实现设计。

将完整的 `skills/github-pages-explainer/` 目录复制到本机 `~/.codex/skills/github-pages-explainer/`，在其他项目中调用：

```text
使用 $github-pages-explainer，为这个项目制作技术讲解网站，
图解配合真实业务实验，完成后 push 并部署 GitHub Pages。
```

该 skill 已通过结构校验，并用搜索与任务队列两个不同项目验证构建、实验和响应式交互。

## 快速启动

需要 Node.js **22.12+**（开发与验证使用 Node 24）和 npm。

```sh
npm install
npm run dev
```

打开 [http://127.0.0.1:3000](http://127.0.0.1:3000)。前端和 API 共用一个端口，无需单独启动后端。

```sh
npm run check       # 类型检查、自动测试、生产构建
npm run build       # 类型检查并构建浏览器代码
npm start           # 在构建后启动生产模式，仍为本机服务
```

## 怎样体验

1. 点击「机架运行总览」：在两个 42U 模拟机架间切换，点击 PowerEdge、GPU 节点或 PowerSwitch，联动查看指标与历史趋势。
2. 按设备类型筛选、开启「只看告警设备」；Rack A02 没有活动告警，可验证空状态。指标统计始终对应当前筛选范围。
3. 点击「GPU 算力监控」：查看利用率、显存、温度和功耗，调整温度阈值，过滤越限 GPU。阈值只是本地分析条件，不修改设备。
4. 点击「交换机与链路」：选择交换机和端口，查看 RX/TX、CRC 计数、链路 Down 与历史曲线。
5. 改变选择后，直接输入「继续分析」或点击界面中的继续分析按钮。输入框上方显示当前上下文，下一轮携带机架、实际选中的设备/端口、历史时窗与阈值。明确的新要求优先。
6. 打开「开发者面板 → 运行时」，查看真实 Worker 状态、耗时和 UI 操作。在「源码」中编辑 DSL，验证容错编译。

普通筛选、设备选择、时窗和阈值调整不发送新的 `/api/chat` 请求。只有继续对话才生成新界面。每个回复的交互状态独立；操作旧回复后，该回复成为下一轮的上下文来源。

演示模式按关键词选择机架 / GPU / 网络三个模板，识别机架号、设备 ID、端口和温度阈值，并接受经过白名单校验的上下文。自由组合界面需要真实模型。数据集中有 **2 个机架、16 台设备、16 张 GPU**，固定在 2026-10-10 14:32:00 UTC+8；三个时窗均使用预置历史曲线。没有实时轮询或实际 Dell 设备连接。

所有遥测、告警、端口速率、U 位与硬件配置均来自 `server/telemetry.ts` 的模拟数据，不代表 Dell 验证配置或厂商阈值建议。场景命名参考 [Dell Private Cloud 官方介绍](https://www.dell.com/en-uk/lp/dt/private-cloud)，本项目是独立演示。

## 参考与取舍

结合用户提供的 [Rabi Guha 推文](https://x.com/rabi_guha/status/2108238432355123572)、[OpenUI 技术分析](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works) 与同团队的 [Open Intelligent UI 开源示例](https://github.com/thesysdev/open-intelligent-ui)：

- 保留生成、编译、执行、渲染分层，以及组件目录、增量更新、独立 appData。
- 将开源示例的领域组件组合方式应用到机架、GPU、端口、遥测、趋势与告警六类监控组件。
- 借鉴回复状态随对话传递的机制，在 `src/core/context.ts` 维护小型白名单快照；发送的是实际可见选择，避免切换机架后携带旧设备。
- 本项目自行实现受限 DSL / AST / Worker，没有接入 OpenUI SDK / Gateway，也不兼容 OpenUI Lang 或完整 DIL。参考的是分层设计与交互机制。

源码对应和后续演进记录在 [参考实现对照](docs/reference-alignment.md)。

## 接入真实模型

```sh
cp .env.example .env
```

在 `.env` 填写自己的配置：

```dotenv
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=你的密钥
LLM_MODEL=服务支持的模型名称
PORT=3000
HOST=127.0.0.1
```

`LLM_BASE_URL` 为 API 根地址，服务端会追加 `/chat/completions`。三个 `LLM_*` 字段必须全部配置。重启服务、刷新页面后，在输入框左下角选择「真实模型」。Key 只在服务端使用，不返回浏览器；没有 `VITE_*` 密钥变量。

适配器通过 `fetch` 消费 `choices[0].delta.content`，支持兼容 Chat Completions 的流式服务。实现依据 [OpenAI 官方流式接口文档](https://developers.openai.com/api/docs/guides/streaming-responses)。真实生成会使用该服务的配额。上游可能返回不合法 DSL；可以在面板查看诊断并手动修正。

没有提供 API Key 的环境只验证演示链路和模拟上游适配器，不代表已完成真实模型连通性验证。

## 实现结构

```text
server/
  app.ts              API 校验、SSE、编译调度、取消与超时
  index.ts            Express + Vite，开发/生产共用端口
  provider.ts         演示流、真实模型流、生成约束
  examples.ts         机架 / GPU / 网络 DSL 模板与场景路由
  telemetry.ts        固定模拟遥测、告警与历史曲线
src/
  core/
    catalog.ts        21 个组件的属性白名单
    monitoring.ts     设备筛选、选择与指标聚合纯函数
    context.ts        监控上下文提取、校验及下一轮回传
    compiler.ts       流式容错解析、IR、常量表、诊断、Markdown 回退
    expression.ts     表达式 AST 白名单和纯函数解释器
    runtime.ts        稳定状态、事件、树差异和操作应用
    types.ts          编译、Worker、SSE 协议类型
  runtime.worker.ts   Worker 消息入口，不接触 DOM
  lib/sse.ts          浏览器/服务端共用 SSE 解码器
  components/
    Renderer.tsx      原生 React 组件与图表
    Monitoring.tsx    机架、遥测、GPU、端口、趋势及告警
    LiveInterface.tsx Worker 生命周期、超时终止、保留旧画面
    Inspector.tsx    源码编辑、状态、数据与事件检查器
    InfoPages.tsx    组件目录与架构介绍
  App.tsx             对话、流式请求、停止、后续 action
tests/                编译器、运行时、流协议和 API 测试
```

更详细的协议和扩展方法见 [docs/architecture.md](docs/architecture.md)。

## POC 边界

- 支持状态声明、派生值、表达式插值、受控组件和 `issueNewTurn` / `copy`；不支持任意 JavaScript、循环、用户函数、完整 Markdown、AppBlock 或图片检索。
- Worker 执行白名单 AST，不使用 `eval` / `new Function`。这是受限解释器方案，没有复刻文章中的跨域 iframe、JavaScript 全局锁定或二进制协议。
- 状态在同一回复的流式重编译中保留。每个新回复有独立 Worker；刷新页面或新建对话会清空状态，未实现持久化。
- 模型收到消息、有限历史与本轮附带的白名单监控上下文；不会收到任意前端状态。新回复独立初始化，不修改旧回复。
- Markdown 回退保留静态文字，用 `〔交互计算〕` 标记动态值，不是可交互界面的完整快照。
- 默认服务仅监听本机，API 拒绝跨站请求。没有账号、持久数据库、生产限流和鉴权；不作为公开服务直接部署。
- 字体使用可选的 Google Fonts；无法联网时使用系统字体，核心交互不依赖远程字体。

## 验证

`npm test` 覆盖三个示例的逐字符截断、最终渲染一致性、流式状态保留、局部 UI 更新、参数校验、原型/全局/函数访问拦截、UTF-8 分片 SSE、API 输入校验、上游错误和中断。真实模型适配器使用模拟上游测试，不需要密钥。

浏览器验收步骤：生成三个场景、键盘操作滑块、切换机架/设备/端口/时窗与告警筛选、验证手动继续对话和后续 action 的上下文、停止流、编辑 DSL、切换 Markdown，以及桌面和手机布局。可选截图保存在被 Git 忽略的 `artifacts/`。
