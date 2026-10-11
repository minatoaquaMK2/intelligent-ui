# 机制教学页与 GitHub Pages

- 教学页：<https://minatoaquamk2.github.io/intelligent-ui/>
- 独立试用：<https://minatoaquamk2.github.io/intelligent-ui/demo/>
- 仓库：<https://github.com/minatoaquaMK2/intelligent-ui>

教学页用七章独立机制图与真实实验解释全链路、本地交互、流式生成、数据直达、两种执行路线、下一轮对话和证据边界。每章支持模块选择、步骤切换、自动演示、流动箭头、2.5D / 平面、层间距与专注视图；章节编号与本图步骤编号独立。图解中的文案、源码片段与下方实验使用同一业务场景。

| 章节          | 对应实验                            | 观察机制                                      |
| ------------- | ----------------------------------- | --------------------------------------------- |
| 01 全链路     | 42U 机架设备选择与功耗              | DSL → 编译产物 → Worker → 注册组件            |
| 02 本地交互   | GPU 选卡与告警筛选                  | 局部 SET 更新、重新编译后保留状态             |
| 03 流式生成   | 机架网络端口面板逐步到达            | 文本常量、未闭合标签恢复、结构更新、暂停续播  |
| 04 数据直达   | 正常 / 链路中断及 CRC 异常快照      | 相同程序绑定新 appData，保留端口选择          |
| 05 执行边界   | 已注册机架控件与被拒绝的表达式      | 未知组件和 window 访问诊断，已有控件继续工作  |
| 06 下一轮对话 | 选择机架、交换机和端口后发出 Action | 显式消息和经过校验的 rack / deviceId / portId |
| 07 证据边界   | 分别操作机架、GPU、网络控件         | 各场景独立记录真实 Worker 回包与本地事件      |

教学输入由 `src/showcase/experiments.ts` 提供，使用确定性的模拟遥测和真实编译器、Worker、业务组件。面板显示实际源码长度、编译诊断和 Worker 操作；完整试用仍保留机架、GPU 与网络监控。

图解直接映射到项目源码。原生组件路线实际运行受限 DSL、编译器、Worker 与 React 渲染器；网页应用路线仅为机制对比，不是编译器已实现的能力。第七章显示真实编译与 Worker 回包验证记录，并区分固定模板、模拟遥测与尚未验证的生产能力。

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

测试 `tests/pages.test.ts` 覆盖静态流式适配、停止生成和三个场景最终渲染；`tests/experiments.test.ts` 验证七章实验的双语编译、设备功耗联动、GPU 状态保留、流式修复、网络快照更新、执行边界和 Action 上下文。响应式布局、图解动效与控件操作还需在浏览器中检查。

## 参考

- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)
