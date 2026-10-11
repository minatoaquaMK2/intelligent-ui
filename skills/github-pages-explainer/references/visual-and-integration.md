# 视觉语言与组件接入

## 来源和视觉锚点

本 skill 从用户的 [Intelligent UI 机制实验室](https://minatoaquamk2.github.io/intelligent-ui/) 提取，基准实现为仓库 `minatoaquaMK2/intelligent-ui` 的提交 `bb84ac2`。保留的是该版本的教学布局与交互经验；以下截图仅作创作参考，不要复制到目标站点冒充目标项目的功能。

- [桌面图解、章节栏与实验入口](previews/desktop.png)
- [320px 机架实验输出](previews/mobile.png)

先查看桌面截图以理解阅读层次，再查看手机截图以理解可用控件的密度。目标站点内容、源码链接和业务数据应来自目标项目。

## 视觉系统

- 纸张底色 `#f5f6ef`、面板 `#fcfcf8`、主文字 `#273e35`、主绿色 `#355b4b`、次文字约 `#687b65`、分隔线 `#dce2d7`。弱对比点阵承载图解，事件路径可用暖棕色区别。
- 顶部品牌和细分隔线；首屏大问题标题，正文保留充足留白。使用清晰无衬线，细小英文/技术标签才用等宽字体；不把正文都缩成装饰性小字。
- 内容最大宽约 1380px，桌面外边距 48px、手机 16px。桌面章节栏约 190px，与内容有明显分隔；窄屏转可滚动横向章节导航。
- 图解由独立卡片模块、顶部图标/STEP、淡色顶面与侧面组成，2.5D 仅帮助区分层次；提供平面视角。图内避免长段落，完整说明放右侧 inspector，窄屏移到下方。
- SVG 默认 1000 × 520，卡片前面 184 × 92，标题留两行，状态点与短标识分开。图太窄时使用内部横向滚动和激活模块自动定位，避免无止境缩小字体。
- 连线先画，标签背景后画，模块最后画；标签放入可用空隙。优先缩短标签或调整布局，ellipsis 只是兜底，不能依赖截断传达关键机制。
- 实验采用浅色可操作输出 + 深色产物面板。分离滚动的代码 tabs 和固定复制按钮。数值和 JSON 实际生成；长 ID、设备名、术语允许换行。

允许目标项目换品牌色和字体；重点保留结构层次、细线、留白、简洁模块和由操作得到结论的节奏。

## 复制资产

将 `assets/diagram-kit/` 和 `assets/page-shell/` 复制到目标项目对应站点目录，保持二者为兄弟文件夹，例如 `site/diagram-kit/` 和 `site/page-shell/`。不要把安装中的 skill 目录作为成品运行时 import 路径。

`page-shell/main.tsx` 渲染独立可运行的搜索示例。`example.tsx` 中有三种不同机制图以及真实的索引、查询和数据替换实验，`search.ts` 是该示例的核心；用目标项目的实际数据/逻辑替换它们。现有应用可只选用 diagram-kit，无需采用整个壳。

图解 kit 依赖 React/TypeScript 和 lucide-react，不依赖原项目的 i18n、编译器、Worker 或服务端。样式文件需要显式 import；CSS 使用 `gx-` 前缀。页面 shell 的默认正文与控件是英文，可通过 `copy`、`diagramLabels` 和章节配置改为用户要求的语言，不必引入翻译框架。

## 图解 API

```tsx
import { DiagramExplorer, defineScene, archetypes } from "./diagram-kit";
import "./diagram-kit/diagram.css";

// Supply real node/edge copy for every slot; see page-shell/example.tsx.
<DiagramExplorer scene={scene} chapterNumber="01" labels={diagramLabels} />;
```

`Scene` 包含 `id, title, summary, nodes, edges, zones?`。节点包含坐标、glyph、name、role、detail，以及可选的 eyebrow、facts、code、source `{label, href}`、color。边包含 `from, to, kind, text, label: [x, y]`，可加端口、偏移与拐点。source 链接要指向目标仓库的对应实现；没有来源就省略，不伪造文件路径。

`defineScene(layout, {id, title, summary, nodes, edgeLabels, zoneLabels?})` 把模块文案和几何布局分开。节点字段按 layout 的 slot ID 填写；七种可选 `archetypes` 是 pipeline、loop、streaming、convergence、boundary、handoff、evidence。它们是拓扑起点，不证明项目采用了其原型技术。slot 中旧的 worker/compiler/model 名只作代码键；目标节点名称、解释、图例和边界要重新定义。拓扑不合适时直接提供自定义 Scene，或修改复制后的布局。

常用布局的 slot：

| 布局        | 节点                                    | 边                               |
| ----------- | --------------------------------------- | -------------------------------- |
| pipeline    | model, compiler, runtime, host, catalog | dsl, ir, operations, catalog     |
| loop        | input, state, diff, render              | event, evaluate, ops, next-input |
| convergence | reference, snapshot, binding, value     | reference, app-data, bound-value |

更多布局看 `diagram-kit/archetypes.ts`，全部类型看 `types.ts`。建议节点短标题不超过两行、短标识不超过一行，边标签不超过约 12 个 ASCII 字符或 6 个汉字；仍须在浏览器确认。`validateScene` 验证空场景、重复 ID 和失效边等结构问题，不能代替语义校对。

## 页面 API

```tsx
<ExplainerPage
  project={{ name, question, introduction, note, repoUrl }}
  chapters={chapters}
  diagramLabels={diagramLabels}
  copy={pageCopy}
  demo={{ title, description, url }}
  implementation={{ description, links }}
/>
```

`project.repoUrl`、`demo`、`implementation` 可省略。每个 `Chapter` 包含：

- `id/short/question/introduction`：导航与叙事。
- `scene`：该章独立的机制图。
- `experiment: {title, instruction, takeaway, scope?}`：实验契约的用户可读版本。
- `renderLab()`：返回该章真实 React 实验组件。

章节切换和重置会重新挂载实验；如目标机制要求跨章保留，显式调整状态归属，并相应修改说明。页面 shell 提供 hash 导航、手机激活项滚动、重置、章节翻页、延后加载 iframe 和源码入口；不附带模型/网络请求计数器。

## 改造规则

已存在 Next、Vue、Svelte、纯 HTML 等应用时，不为复用这些 React 文件迁移整站。保留其框架，照视觉参考与叙事契约重建等价组件；可以抽用布局数据和 CSS 原则。GitHub Pages 静态输出按照目标框架已有构建方式完成。

同一 repo 的教学页和完整 Demo 应共享可运行组件/核心，保证输入输出能对应。共用的业务 CSS 也要被教学入口加载。嵌入的完整 Demo 是另一视口，需单独测试其实际宽度。
