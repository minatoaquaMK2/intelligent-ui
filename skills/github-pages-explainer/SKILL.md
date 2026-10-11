---
name: github-pages-explainer
description: Build or adapt technical explanation websites for GitHub Pages using chapter-based storytelling, distinct interactive architecture diagrams, and hands-on experiments grounded in the target project. Use when a user wants an Intelligent UI style mechanism lab, educational project showcase, or an explainer that teaches how a system works while demonstrating it. Not for ordinary API docs or a generic marketing page without mechanism explanations.
---

# GitHub Pages 机制实验室

把一个项目讲成可以操作的技术说明书：读者先理解问题，沿图解看见因果，再通过项目自己的实验观察结果。复用的是叙事与交互语言，目标项目的实现决定图中画什么。

## 从项目建立章节契约

先读目标仓库的入口、核心模块、可运行示例、测试和现有发布方式。找出哪些能力在浏览器内实际运行，哪些依赖服务，哪些仅可演示。已有站点按其技术栈和用户要求改造；新站点可使用下方 React 骨架。

为每章先写一个简短契约，再实现页面：

- **问题**：读者在本章要弄懂的一件事。
- **机制与源码依据**：参与者、输入、转换、边界和反馈；标出对应源码。
- **图解**：独立的节点和有方向的边，用来解释该章因果关系。
- **实验**：用户改变什么，哪些条件保持不变，预期哪个结果变化。
- **证据**：让用户看到实际状态、产物、日志或统计；注明模拟数据与验证范围。

详见 [references/story-and-experiments.md](references/story-and-experiments.md)。七章是原站点的成熟示例，不是配额；按目标项目的机制数量增减。每章换一张合适的图，实验与图中的对象、术语和路径一致。避免给不同章节换标题后重复同一个滑块。

## 搭建页面与图解

采用「简洁首屏 → EXPLORE THE SYSTEM 章节区 → 各章图解与实验 → 完整试用 → 实现与边界」的阅读路径。页面重点在机制，业务控件承担验证作用。

先读 [references/visual-and-integration.md](references/visual-and-integration.md)。其中有视觉参数、源码组件 API、复制方法及原站点截图。

- [assets/diagram-kit/](assets/diagram-kit/)：可直接复制的 React/TypeScript SVG 图解组件。支持独立拓扑、2.5D/平面、节点讲解、代码与来源、层间距、箭头动效、自动演示、暂停、专注视图及键盘操作。
- [assets/page-shell/](assets/page-shell/)：配套章节页面、样式和一个可运行的本地搜索示例。替换成目标项目的内容和实验；示例本身不证明目标项目实现了同样机制。

尽量把章节标题、图节点、讲解和实验契约放在同一份配置中。CHAPTER 表示章节序号，STEP 仅表示当前图内的模块序号，不能用章节下标点亮一个共用流程图。

保留目标项目已有语言与品牌要求。新项目默认使用用户的语言；只有需要多语言时再抽翻译层。组件 kit 接受 labels，使用它不要求建设 i18n。

实验尽量调用项目真实纯函数、组件、协议或可独立运行的核心。静态站不能调用服务器时，使用明确标示的确定性输入；实际计算仍应运行。只显示按按钮生成的固定 JSON，就不能宣称已验证后端或真实模型。

## 浏览器验收后再发布

读 [references/verification-and-pages.md](references/verification-and-pages.md)，执行适合目标项目的构建、机制测试和实际浏览器检查。尤其检查长标题、箭头标签、窄屏导航与代码栏，以及每章操作后的真实产物。不能以截图漂亮或构建通过代替交互验证。

用户已要求发布或 push 时，沿已有授权完成提交、推送、工作流和线上验证。仅要求设计、抽取 skill 或本地预览时，完成本地可审阅产物即可；不据此新建公开仓库、修改现有仓库可见性或发布其他项目。GitHub Pages 子路径、静态后端限制和工作流细节见同一参考文件。

交付时说明页面/本地入口、图解与实验覆盖、验证结果和实际发布状态。只有构建部署成功且线上加载到本次产物，才称已上线。
