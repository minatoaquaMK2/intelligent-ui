import {
  ArrowDown,
  ArrowUpRight,
  Box,
  Braces,
  Check,
  Code2,
  Cpu,
  Database,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { catalog } from '../core/catalog';

const labels: Record<string, string> = {
  box: '容器',
  row: '水平布局',
  grid: '网格布局',
  title: '标题',
  text: '文本',
  caption: '辅助说明',
  badge: '状态标签',
  stat: '指标卡',
  slider: '数值滑块',
  toggle: '切换开关',
  select: '选项输入',
  chart: '柱状图',
  table: '数据表格',
  divider: '分隔线',
  button: '操作按钮',
  rack: '可选机架图',
  device: '设备遥测',
  trend: '时间序列',
  gpus: 'GPU 矩阵',
  ports: '交换机端口',
  alerts: '告警列表',
};

export function CatalogPage() {
  return (
    <div className="info-page">
      <div className="page-eyebrow">
        <Box size={14} />
        COMPONENT CATALOG
      </div>
      <h1>有限的组件，无限的组合。</h1>
      <p className="page-intro">
        模型选择组件，编译器检查属性，React 负责最终呈现。所有组件共享同一套设计语言。
      </p>
      <div className="catalog-summary">
        <span>
          <Check size={14} />
          {Object.keys(catalog).length} 个注册组件
        </span>
        <span>
          <ShieldCheck size={14} />
          属性白名单校验
        </span>
        <span>
          <Layers size={14} />
          统一设计 Token
        </span>
      </div>
      <div className="catalog-grid">
        {Object.entries(catalog).map(([name, props], index) => (
          <article className="catalog-card" key={name}>
            <div>
              <span className="component-symbol">
                {index < 3 ? (
                  <Layers size={19} />
                ) : index < 8 ? (
                  <Code2 size={19} />
                ) : index < 11 ? (
                  <Braces size={19} />
                ) : (
                  <Box size={19} />
                )}
              </span>
              <code>&lt;{name} /&gt;</code>
            </div>
            <h3>{labels[name]}</h3>
            <div className="prop-chips">
              {Object.entries(props).map(([key, rule]) => (
                <span key={key} title={Array.isArray(rule) ? rule.join(' | ') : String(rule)}>
                  {key}
                </span>
              ))}
              {!Object.keys(props).length && <span>无属性</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ArchitecturePage() {
  const steps = [
    {
      icon: Sparkles,
      label: '01 · GENERATE',
      title: '用语言描述界面',
      text: '真实模型输出 DIL 风格源码；演示模式按关键词选择固定模板。输入既包含文字，也包含状态声明和白名单组件。',
      code: '{@state threshold = 80}\n<slider value={threshold} onChange={setThreshold} />',
    },
    {
      icon: Code2,
      label: '02 · COMPILE',
      title: '服务端持续编译',
      text: '每个片段到达后重编译累计源码。自动闭合未完成标签，校验组件和属性，将文本拆到常量表，再通过 SSE 发送变化。',
      code: '{ program, constants, diagnostics, fallbackMarkdown }',
    },
    {
      icon: Cpu,
      label: '03 · EXECUTE',
      title: 'Worker 内计算状态与差异',
      text: '受限 AST 解释器执行纯表达式。按名称保存状态，对比前后组件树，只把变化编码为渲染操作。',
      code: 'EVENT → setThreshold(85) → SET gpus.threshold = 85',
    },
    {
      icon: Layers,
      label: '04 · RENDER',
      title: '原生组件，即时响应',
      text: 'React 将 CREATE / SET / PLACE / REMOVE 等操作映射到注册组件。用户操作返回 Worker；只有 issueNewTurn 会开始新一轮生成。',
      code: 'UI event → handler ID → Worker → UI operations',
    },
  ];
  return (
    <div className="info-page architecture-page">
      <div className="page-eyebrow">
        <Layers size={14} />
        HOW IT WORKS
      </div>
      <h1>从一个想法，到一个界面。</h1>
      <p className="page-intro">
        这个 POC 参考 OpenUI 的逆向分析，验证“模型生成、服务端编译、客户端执行”的闭环。
      </p>
      <div className="architecture-flow">
        {steps.map((step, index) => (
          <div key={step.label}>
            <article>
              <span className="architecture-icon">
                <step.icon size={23} />
              </span>
              <div>
                <span className="step-label">{step.label}</span>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <code>{step.code}</code>
              </div>
            </article>
            {index < steps.length - 1 && <ArrowDown className="flow-down" size={20} />}
          </div>
        ))}
      </div>
      <div className="architecture-notes">
        <div>
          <Database size={20} />
          <h3>数据独立传递</h3>
          <p>
            机架、服务器、GPU 与交换机遥测以 appData 独立注入；当前使用固定模拟快照与预置历史曲线。
          </p>
        </div>
        <div>
          <Radio size={20} />
          <h3>可观察的流式过程</h3>
          <p>开发者面板展示实际源码、编译诊断、状态和事件，不使用预填的性能指标。</p>
        </div>
        <div>
          <ShieldCheck size={20} />
          <h3>明确的 POC 边界</h3>
          <p>
            实现受限 DSL 与 AST 解释器；不执行任意 JavaScript，不实现完整 DIL、AppBlock 或跨域
            iframe 沙箱。
          </p>
        </div>
      </div>
      <a
        className="reference-link"
        href="https://www.openui.com/blog/how-chatgpt-intelligent-ui-works"
        target="_blank"
        rel="noreferrer"
      >
        阅读参考文章：How ChatGPT Intelligent UI works <ArrowUpRight size={16} />
      </a>
      <a
        className="reference-link"
        href="https://github.com/thesysdev/open-intelligent-ui"
        target="_blank"
        rel="noreferrer"
      >
        参考实现：Open Intelligent UI <ArrowUpRight size={16} />
      </a>
      <p className="page-intro">
        借鉴其领域组件组合与界面状态回传：当前设备选择和筛选条件会随下一轮对话发送。本 POC
        使用自己的受限 DSL 与 Worker，不直接依赖 OpenUI SDK。
      </p>
    </div>
  );
}
