# 机制教学页与 GitHub Pages

- 教学页：<https://minatoaquamk2.github.io/intelligent-ui/>
- 独立试用：<https://minatoaquamk2.github.io/intelligent-ui/demo/>
- 仓库：<https://github.com/minatoaquaMK2/intelligent-ui>

教学页用交互架构图与六组真实实验解释项目的 DSL、编译、状态、流式容错、数据绑定和显式 action。它复用项目的编译器、Worker 和 React 渲染器。页面不声称复刻 ChatGPT 内部实现。

## 本地预览与构建

```sh
npm ci
npm run pages:dev
# http://127.0.0.1:4175/intelligent-ui/

npm run pages:build
npm run pages:preview
```

原 POC 仍使用 `npm run dev`，在本机 Express 服务上运行。教学页和静态试用有单独入口，避免改变本地模型接入方式。

## 公开试用怎样工作

`site/demo/main.tsx` 在加载原有 App 前安装 `src/showcase/static-demo.ts`。这个仅限静态入口的适配器拦截同源 `/api/config`、`/api/chat` 与 `/api/compile`，用浏览器中的 `Response` 和 `ReadableStream` 提供与本机 API 相同的事件结构。

演示源码与模拟遥测来自 `server/examples.ts` / `server/telemetry.ts`；这些文件是纯数据和模板，不依赖 Express、模型适配器或 `.env`。静态入口不会打包 `server/provider.ts`，没有模型服务凭据。真实模型模式在公开试用中关闭。

源代码在浏览器中逐段解析，编译产物交给真正的 Web Worker。状态更新、组件树差异、数据绑定和 action 都使用原项目逻辑。演示时间间隔只用于展示流式过程，不代表模型延迟。

教学页中的 iframe 直接嵌入同站点 `demo/`。访客也可在独立标签页打开或全屏试用。iframe 是展示容器，不是用于执行任意代码的安全沙箱。

## 自动部署

`vite.pages.config.ts` 设置站点根目录 `site/`、仓库子路径 `/intelligent-ui/` 和输出目录 `dist-pages/`。修改仓库名称时需要同步修改 base、页面链接和本文地址。

`.github/workflows/pages.yml` 在 `main` 更新时执行安装、类型检查、全部测试和 Pages 构建，然后发布构建产物。GitHub 仓库 Settings → Pages 的 Source 应为 GitHub Actions。无需提交生成的 `dist-pages/`。

测试 `tests/pages.test.ts` 覆盖静态流式适配、停止生成、三个场景最终渲染、状态保留、数据变化和未完成标签。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)
- [交互教学页面参考](https://kejun.github.io/demos/chatgpt-intelligent-ui/)
