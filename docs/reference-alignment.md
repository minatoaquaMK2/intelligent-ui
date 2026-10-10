# 参考实现与本 POC 的对应关系

核对日期：2026-10-10。

用户提供的 [Rabi Guha 推文](https://x.com/rabi_guha/status/2108238432355123572)强调模型输出专用语言、服务端编译与流式传输、客户端原生组件渲染。推文正文通过 X 官方 oEmbed 读取；其 X 长文页面受访问限制。架构细节以此前提供的 [OpenUI 分析文章](https://www.openui.com/blog/how-chatgpt-intelligent-ui-works)和团队公开源代码为依据。

另核对 [thesysdev/open-intelligent-ui](https://github.com/thesysdev/open-intelligent-ui) 的 README、组件库、回复状态及聊天接口。它使用 OpenUI SDK 实现旅行交互体验，与分析文章中的 ChatGPT 内部协议并非同一个实现。当前 POC 没有导入或复制该仓库代码，采用自己的受限 DSL。

| 参考设计                 | 本项目落点                                                   | 当前边界                               |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| 模型输出专用 UI 语言     | `server/provider.ts` 提示词，`server/examples.ts` 模板       | 自定义 DIL 风格子集；不是 OpenUI Lang  |
| 目录定义允许的组件与属性 | `src/core/catalog.ts` 与原生 Renderer                        | 21 个组件；没有任意 HTML / React 输出  |
| 按领域注册组合组件       | `Monitoring.tsx` 的 rack、device、trend、gpus、ports、alerts | 替换旅行地图/行程为机架/设备遥测       |
| 流式显示与稳定状态       | 编译器、SSE patch、Worker Runtime                            | 累计重编译、常量表拆分、局部树差异     |
| 同一回复的组件共享选择   | Worker 的 selectItem / 派生值                                | 设备、详情、趋势联动；新回复有独立状态 |
| 将用户修改带入后续对话   | `core/context.ts` → POST context → 模板或模型消息            | 白名单快照；当前会话内保存，刷新清空   |
| 统一原生视觉             | `styles.css`、`monitoring.css`、注册组件                     | Dell 蓝色主题及桌面/手机布局           |

## 核对的主要源码

- [library.ts](https://github.com/thesysdev/open-intelligent-ui/blob/main/src/lib/library.ts)：自定义领域组件与内置组件共同注册，并提供组合规则。
- [route/store.ts](https://github.com/thesysdev/open-intelligent-ui/blob/main/src/lib/route/store.ts)：使用回复状态保存选择和用户修改，供多个组件共享。
- [api/chat/route.ts](https://github.com/thesysdev/open-intelligent-ui/blob/main/src/app/api/chat/route.ts)：将回复中的修改记录转成下一轮模型上下文，同时验证请求角色、输入大小与配置。

## 监控场景中的具体行为

选择 Rack A02 的某张 GPU 后，将阈值调整到 88°C，再输入“继续分析”：界面会传递当前 GPU ID、机架、时窗与阈值。新的演示回复继承这些默认条件；如果输入明确要求 Rack A01 或 75°C，则新条件优先。

切换机架或开启告警筛选后，原选中设备可能不再可见。上下文取自派生后的实际选择，避免把旧 state 中的设备 ID 错传给模型。设备、GPU 与端口事件都检查当前可见列表；没有结果时显示空状态并禁用继续分析。

## 后续演进

当前保留自有编译器与 Worker，便于检查文章描述的链路。若后续目标转向使用 OpenUI 生态，可另建 SDK 适配层，将这六类领域组件注册到其组件库，并迁移语言、状态与流协议；不能仅替换一个 renderer 就声称兼容。

真实监控数据应通过服务端采集层归一化为 appData，加入资产权限、采样时间和新鲜度信息。现有模拟快照、历史曲线与阈值仅用于交互演示；尚未实现真实遥测采集、设备操作、OpenUI Gateway 自动修复或会话持久化。
