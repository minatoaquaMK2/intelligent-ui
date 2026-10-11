# 浏览器验收与 GitHub Pages

## 验证与机制相关的结果

先运行项目规定的类型检查、构建和必要测试。新增测试针对章节声明的不变量，不只断言标题、DOM 类名或固定字符串。示例：查询输入真正改变匹配集合，替换数据后保持筛选，非法表达式产生诊断，点击“提交”才生成动作，停止后不再接受后续输出。

之后使用可用浏览器工具打开实际构建产物。优先使用环境提供的浏览器技能；独立会话和服务使用任务自己的名称，完成后清理自己启动的资源。截图后实际查看，几何扫描只作补充。

对图解与实验进行有代表性的验收：

- 逐章核对章节、图、讲解、实验使用同一术语和因果关系；点节点确实更换讲解，页签更换实际产物。
- 检查约 1440、1024/768、390/320px；先覆盖最长标题和最密控件，再遍历其他章节。若有多语言，覆盖较长文案，不为测试新增用户未要求的语言。
- 所有视角与间距极值下，标题留在节点面内，状态点不占文字空间，路径/箭头不穿过标签，标签背景不压住相邻节点或步骤图标。
- 章节编号独立于 STEP；直接打开末章 hash、缩放窗口、使用下一章，激活项仍可见。窄屏图允许内部横向滚动，但选择模块应滚到模块；页面整体不能横向溢出。
- 检查焦点可见、Tab/Enter、实验 tabs 的方向键/Home/End、暂停动效、自动演示、减少动态效果偏好、专注视图的 Esc/焦点恢复和滚动锁。
- 操作每章声明的场景，核对实际输入/状态/输出；测试重置、正在更新时操作、无结果或拒绝输入等相关状态。
- 代码 tabs 可滚动，复制按钮保持可见；复制失败有反馈。组件样式需被教学入口加载，不能只在完整 Demo 入口存在。
- 独立测试 iframe 内部宽度。320px 外层很可能只剩约 286px 内层，主站响应式正常不代表嵌入 Demo 正常。检查输入框、示例卡、长设备名、端口图、对话工具栏。
- 检查浏览器错误、Worker 加载、请求和资源路径；本地 dev 成功后还需预览生产构建。

大多数修复只需重查受影响的场景；未改动的检查不用机械重复。可保留关键桌面/手机截图和观察结果供交付，但无需把临时截图提交进产品仓库。

## 适配现有仓库

已有 GitHub Pages 工作流就沿用并核实产物目录。已有前端、包管理器和构建脚本优先保持。创建独立 `site/` 入口通常适合只增加说明页的仓库，不覆盖现有应用入口或切换技术栈。

新建 React/Vite 示例可复制 `assets/diagram-kit/` 和 `assets/page-shell/` 到 `site/` 下，再使用下面的入口。目标项目需要的依赖是 React、React DOM、lucide-react，以及其构建工具；不要把原项目的 Express、LLM 适配器或监控业务一并带入。为目标项目选择兼容版本，提交对应包管理器锁文件。

```html
<!-- site/index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>项目机制实验室</title>
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./page-shell/main.tsx"></script>
  </body>
</html>
```

```ts
// vite.pages.config.ts — adapt base to the actual Pages URL.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  root: "site",
  base: "/your-repository/",
  build: { outDir: "../dist-pages", emptyOutDir: true },
});
```

`base` 必须用实际目标替换：项目 Pages 通常是 `/repo-name/`；用户/组织根站或自定义域名通常为 `/`。从已确认的远端与 Pages 配置推导，不能沿用 `intelligent-ui`。内部资源和 Demo URL 使用构建器 base；hash 章节导航避免静态站深路径刷新 404。不同构建器使用其等价设置。

仅做本地预览、尚未确定远端时，可暂用 `base: './'` 生成相对资源路径；正式部署前再按实际 Pages 地址核验。骨架提供教学入口，完整 Demo 若使用另一个 HTML 入口，需要将它加入目标构建器的多入口配置，并与教学实验共享核心组件；构建后直接打开该入口验证，不能只测试开发服务器。

下面的工作流是结构示例，只有用户要求发布且目标仓库适配 npm/Vite 时才复制。与现有 workflow 合并，核实默认分支、脚本和输出目录；不能把示例节点版本或 action major 当成永久最新版本。

```yaml
name: Deploy GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: github-pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run pages:build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist-pages
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
    steps:
      - uses: actions/deploy-pages@v4
```

GitHub Pages 只托管静态文件。需要服务端密钥的 API 不能直接搬进浏览器；公开演示使用静态适配或已授权服务。确认发布清单来自目标代码和公开 fixture，不带本地 `.env`、私有导出或凭据。

## 完成授权的发布

确认目标仓库、remote、分支和 Pages 来源。用户说“发布到我的 GitHub public repo”时，确定账号及合适仓库后可完成其授权；只有当目标账号、现有仓库可见性变更等关键选择仍不明确时才需要补充信息。曾发布过本 skill 的来源仓库不代表所有新项目都可自动公开。

构建和浏览器验收完成后，按授权提交并推送。使用已配置的 GitHub 连接或 CLI；查询本次 commit 对应的工作流。构建部署失败时，针对日志的具体原因修复，不循环盲目重跑，也不把状态“queued”称为完成。

部署成功后重新打开公开 URL，核对加载的是本次构建的 JS/CSS（或其他版本标识），实际操作一个关键实验，检查 Demo 与资源路径。报告 commit、部署结果和可打开的链接。没有授权部署则交付本地预览与可审阅文件，明确尚未发布。
