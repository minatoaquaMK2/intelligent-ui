import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Github,
  Layers3,
  Maximize2,
  Menu,
  X,
} from 'lucide-react';
import { MechanismLab } from './MechanismLab';
import { COMPONENT_COUNT, lessons, REPO, sourceLink, stages } from './lessons';
import '../styles.css';

function Brand() {
  return (
    <a className="s-brand" href="#top" aria-label="Intelligent UI 机制实验室首页">
      <span className="s-brand-symbol" aria-hidden="true">
        <Layers3 size={24} strokeWidth={1.7} />
      </span>
      <span>
        intelligent<span className="s-brand-light">ui</span>
        <small>机制实验室</small>
      </span>
    </a>
  );
}

function ArchitectureDiagram({
  selected,
  onSelect,
  flat,
}: {
  selected: number;
  onSelect: (n: number) => void;
  flat: boolean;
}) {
  const positions = [
    [32, 73],
    [268, 73],
    [504, 73],
    [740, 73],
    [280, 253],
  ];
  return (
    <svg
      className="s-architecture-svg"
      viewBox="0 0 976 366"
      role="group"
      aria-label="交互式架构图：选择各层查看职责"
    >
      <defs>
        <pattern id="diagram-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="#c9d2c8" />
        </pattern>
        <marker
          id="arrow-forward"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M1 1 9 5 1 9" fill="none" stroke="#789087" strokeWidth="1.7" />
        </marker>
        <marker
          id="arrow-back"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M1 1 9 5 1 9" fill="none" stroke="#b7805e" strokeWidth="1.7" />
        </marker>
      </defs>
      <rect width="976" height="366" fill="url(#diagram-dots)" />
      <g fill="none" stroke="#789087" strokeWidth="1.6" markerEnd="url(#arrow-forward)">
        {[0, 1, 2].map((n) => (
          <path
            key={n}
            d={`M ${positions[n][0] + (flat ? 180 : 204)} 126 H ${positions[n + 1][0] - 9}`}
          />
        ))}
        <path d="M 485 292 H 589 V 201" strokeDasharray="5 5" />
      </g>
      <path
        d="M 828 196 V 224 H 595 V 196"
        fill="none"
        stroke="#b7805e"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        markerEnd="url(#arrow-back)"
      />
      <g className="s-svg-micro" fill="#6d7d74">
        <text x="248" y="107" textAnchor="middle">
          DSL
        </text>
        <text x="484" y="107" textAnchor="middle">
          IR
        </text>
        <text x="720" y="107" textAnchor="middle" fontSize="7">
          UI OPS
        </text>
        <text x="603" y="291">
          独立数据输入
        </text>
        <text x="709" y="244" textAnchor="middle" fill="#a37658">
          处理器 ID + 事件值
        </text>
      </g>
      {stages.map((stage, n) => {
        const [x, y] = positions[n];
        const height = n === 4 ? 68 : 115;
        const active = n === selected;
        return (
          <g
            key={stage.name}
            className={`s-diagram-node ${active ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${stage.name}：${stage.role}`}
            aria-pressed={active}
            onClick={() => onSelect(n)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(n);
              }
            }}
          >
            {!flat && (
              <>
                <path d={`M${x} ${y}l26 -20h180l-26 20Z`} fill={stage.color} stroke="#a8b8ad" />
                <path
                  d={`M${x + 180} ${y}l26 -20v${height}l-26 20Z`}
                  fill={active ? '#85ac99' : '#c7d2c7'}
                  stroke="#a8b8ad"
                />
              </>
            )}
            <rect
              className="s-node-face"
              x={x}
              y={y}
              width="180"
              height={height}
              fill={active ? '#294f45' : '#f9faf6'}
              stroke={active ? '#294f45' : '#9dab9e'}
              strokeWidth={active ? '2' : '1.2'}
            />
            <text
              x={x + 17}
              y={y + 29}
              fill={active ? '#f2f5e9' : '#2d4b41'}
              fontSize="16"
              fontWeight="600"
            >
              {stage.name}
            </text>
            <circle cx={x + 160} cy={y + 25} r="3.1" fill={active ? '#d2ef93' : '#a6b9ac'} />
            <text
              className="s-svg-micro"
              x={x + 17}
              y={y + 49}
              fill={active ? '#c1d6c7' : '#78877b'}
            >
              {stage.english}
            </text>
            {n !== 4 && (
              <>
                <line
                  x1={x + 17}
                  y1={y + 67}
                  x2={x + 163}
                  y2={y + 67}
                  stroke={active ? '#547368' : '#dbe2d9'}
                />
                <text x={x + 17} y={y + 91} fill={active ? '#e2eade' : '#647368'} fontSize="11">
                  {stage.role}
                </text>
              </>
            )}
            <text className="s-svg-micro" x={x} y={y - (flat ? 12 : 32)} fill="#557367">
              0{n + 1} / {n === 4 ? 'DATA LANE' : 'EXECUTION LAYER'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Showcase() {
  const [chapter, setChapter] = useState(() =>
    Math.max(
      0,
      lessons.findIndex((item) => `#${item.id}` === window.location.hash),
    ),
  );
  const [selected, setSelected] = useState(lessons[chapter].node as number);
  const [flat, setFlat] = useState(false);
  const [menu, setMenu] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);
  const lesson = lessons[chapter];
  const stage = stages[selected];
  const demoUrl = `${import.meta.env.BASE_URL}demo/`;
  function choose(index: number, scroll = false) {
    setChapter(index);
    setSelected(lessons[index].node);
    history.replaceState(null, '', `#${lessons[index].id}`);
    if (scroll)
      document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  useEffect(() => {
    const sync = () => {
      const index = lessons.findIndex((item) => `#${item.id}` === location.hash);
      if (index >= 0) {
        setChapter(index);
        setSelected(lessons[index].node);
      }
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return (
    <div className="s-site" id="top">
      <a className="s-skip" href="#learn">
        跳到交互实验
      </a>
      <header className="s-header s-container">
        <Brand />
        <button
          className="s-mobile-toggle"
          aria-label={menu ? '关闭导航' : '打开导航'}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menu ? 'is-open' : ''} aria-label="页面导航">
          <a href="#learn" onClick={() => setMenu(false)}>
            机制与实验
          </a>
          <a href="#demo" onClick={() => setMenu(false)}>
            完整 Demo
          </a>
          <a href="#about" onClick={() => setMenu(false)}>
            实现说明
          </a>
        </nav>
        <a className="s-github" href={REPO} target="_blank" rel="noreferrer">
          <Github size={16} />
          GitHub
          <ArrowUpRight size={14} />
        </a>
      </header>

      <main>
        <section className="s-hero s-container" aria-labelledby="hero-title">
          <div>
            <div className="s-eyebrow">
              <span className="s-status-dot" /> AN INTERACTIVE FIELD GUIDE{' '}
              <span className="s-hero-edition">VOL. 01</span>
            </div>
            <h1 id="hero-title">
              一句话，如何成为
              <br />
              <span>可交互的界面？</span>
            </h1>
            <p className="s-hero-description">
              拆开 Intelligent UI 背后的每一层。
              <br />
              从模型描述到本地交互，一边理解，一边运行。
            </p>
            <div className="s-hero-actions">
              <a className="s-primary" href="#learn">
                开始探索
                <ArrowDown size={16} />
              </a>
              <a className="s-text-link" href="#demo">
                直接试用 POC
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
          <div className="s-hero-note">
            <div className="s-note-top">
              <span>THE KEY IDEA</span>
              <span>↗</span>
            </div>
            <h2>
              生成一次，
              <br />
              交互多次。
            </h2>
            <p>
              模型生成界面描述之后，状态与计算可以留在浏览器。每次点击，不必都是一次新的模型请求。
            </p>
            <div className="s-note-loop">
              <span>用户操作</span>
              <ArrowRight size={15} />
              <span>Worker</span>
              <ArrowRight size={15} />
              <span>界面更新</span>
              <i />
            </div>
            <div className="s-note-bottom">
              <Code2 size={14} />
              <span>独立 POC · 源码可读 · 实验可运行</span>
            </div>
          </div>
        </section>

        <div className="s-intro-strip s-container">
          <span>
            <BookOpen size={15} />
            六个章节，一条完整链路
          </span>
          <span>
            DIAGRAMS <i /> LIVE EXPERIMENTS <i /> SOURCE CODE
          </span>
          <a href="#learn">
            SCROLL TO EXPLORE <ArrowDown size={12} />
          </a>
        </div>

        <section className="s-workbench s-container" id="learn" aria-label="机制教学与交互实验">
          <aside className="s-chapters">
            <div className="s-chapter-label">EXPLORE THE SYSTEM</div>
            <nav aria-label="机制章节">
              {lessons.map((item, index) => (
                <button
                  key={item.id}
                  aria-current={chapter === index ? 'step' : undefined}
                  onClick={() => choose(index)}
                >
                  <span>0{index + 1}</span>
                  {item.short}
                  <ChevronRight size={13} />
                </button>
              ))}
            </nav>
            <div className="s-sidebar-note">
              <span className="s-status-dot" />
              <p>
                图解负责解释，
                <br />
                实验负责验证。
              </p>
              <span>
                点击图中任意一层
                <br />
                查看它的输入与输出。
              </span>
            </div>
            <a
              className="s-sidebar-source"
              href={sourceLink('docs/architecture.md')}
              target="_blank"
              rel="noreferrer"
            >
              阅读架构文档
              <ArrowUpRight size={13} />
            </a>
          </aside>
          <div className="s-lesson-content">
            <div className="s-lesson-topline">
              <span>
                CHAPTER 0{chapter + 1} <i>/</i> {lesson.eyebrow}
              </span>
              <span>LEARN BY DOING</span>
            </div>
            <h2 className="s-lesson-title">{lesson.name}</h2>
            <p className="s-lesson-description">{lesson.description}</p>

            <div className="s-diagram-panel">
              <div className="s-diagram-toolbar">
                <div className="s-diagram-legend">
                  <span>
                    <i />
                    程序 / 数据
                  </span>
                  <span>
                    <i />
                    本地事件
                  </span>
                </div>
                <div className="s-segment" aria-label="架构图视角">
                  <button aria-pressed={!flat} onClick={() => setFlat(false)}>
                    2.5D
                  </button>
                  <button aria-pressed={flat} onClick={() => setFlat(true)}>
                    平面
                  </button>
                </div>
              </div>
              <ArchitectureDiagram selected={selected} onSelect={setSelected} flat={flat} />
              <div className="s-layer-inspector" aria-live="polite">
                <div className="s-layer-number">
                  0{selected + 1}
                  <span>{stage.english}</span>
                </div>
                <div className="s-layer-description">
                  <h3>
                    {stage.name}
                    <span>{stage.role}</span>
                  </h3>
                  <p>{stage.detail}</p>
                  <a href={sourceLink(stage.file)} target="_blank" rel="noreferrer">
                    {stage.file}
                    <ArrowUpRight size={12} />
                  </a>
                </div>
                <pre>
                  <code>{stage.code}</code>
                </pre>
              </div>
            </div>

            <MechanismLab key={lesson.id} lesson={lesson.id} />

            <div className="s-chapter-pagination">
              <button disabled={chapter === 0} onClick={() => choose(chapter - 1, true)}>
                <ArrowLeft size={15} />
                上一章
              </button>
              <span>
                0{chapter + 1} / 0{lessons.length}
              </span>
              {chapter < lessons.length - 1 ? (
                <button onClick={() => choose(chapter + 1, true)}>
                  下一章：{lessons[chapter + 1].short}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <a href="#demo">
                  进入完整 Demo
                  <ArrowRight size={15} />
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="s-demo-section" id="demo" aria-labelledby="demo-title">
          <div className="s-container">
            <div className="s-section-label">
              FROM MECHANISM TO APPLICATION <span>把刚才学到的，放进一个完整场景。</span>
            </div>
            <div className="s-demo-heading">
              <div>
                <h2 id="demo-title">现在，亲手试一遍。</h2>
                <p>
                  同一套编译器和运行时，驱动一个机架监控 POC。
                  <br />
                  生成界面、点选设备、调整阈值，再打开开发者面板，看见每一次状态与操作。
                </p>
              </div>
              <a className="s-control" href={demoUrl} target="_blank" rel="noreferrer">
                独立打开 Demo
                <ExternalLink size={15} />
              </a>
            </div>
            <div className="s-demo-shell" ref={demoRef}>
              <div className="s-demo-toolbar">
                <span className="s-window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>INTELLIGENT UI / PLAYGROUND</span>
                <button
                  aria-label="全屏试用 Demo"
                  onClick={() => {
                    if (demoRef.current?.requestFullscreen)
                      void demoRef.current
                        .requestFullscreen()
                        .catch(() => setFullscreenError(true));
                    else setFullscreenError(true);
                  }}
                >
                  <Maximize2 size={15} />
                </button>
              </div>
              <div className="s-demo-disclosure">
                <span>
                  <span className="s-status-dot" /> 浏览器演示 · 无需 API Key
                </span>
                <span>Dell Private Cloud 场景 / 模拟遥测与预置模板</span>
              </div>
              {!demoLoaded && <div className="s-demo-loading">正在加载试用界面…</div>}
              <iframe
                src={demoUrl}
                title="Intelligent UI 完整 POC 在线试用：机架、GPU 与网络监控"
                loading="lazy"
                onLoad={() => setDemoLoaded(true)}
                allow="clipboard-write; fullscreen"
              />
            </div>
            {fullscreenError && (
              <p className="s-footnote" role="status">
                当前浏览器不支持全屏，请使用「独立打开 Demo」。
              </p>
            )}
            <div className="s-demo-guide">
              <span>
                <b>01</b>选择一个预置场景
              </span>
              <ChevronRight size={13} />
              <span>
                <b>02</b>调整控件，观察联动
              </span>
              <ChevronRight size={13} />
              <span>
                <b>03</b>打开开发者面板，检查状态
              </span>
            </div>
            <p className="s-demo-limit">
              公开试用在浏览器内模拟流式 API，并运行真实编译器与
              Worker；不调用模型，也不连接实际设备。自由生成请下载源码，在本地配置模型服务。
            </p>
          </div>
        </section>

        <section className="s-about s-container" id="about" aria-labelledby="about-title">
          <div>
            <div className="s-section-label">READ THE IMPLEMENTATION</div>
            <h2 id="about-title">
              原理可以拆开，
              <br />
              实现也可以。
            </h2>
            <p>
              这是一份独立的生成式 UI 概念验证。所有实验都能回到对应源码，继续验证、修改和扩展。
            </p>
            <a className="s-primary" href={REPO} target="_blank" rel="noreferrer">
              <Github size={16} />
              查看 GitHub 源码
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="s-about-details">
            <h3>这份 POC 实现了什么</h3>
            <ul>
              <li>
                <Check size={15} />
                受限 DSL、容错编译器与 {COMPONENT_COUNT} 种注册组件
              </li>
              <li>
                <Check size={15} />
                Worker 内的 AST 解释、状态与组件树差异
              </li>
              <li>
                <Check size={15} />
                独立 appData、显式 action 与本地模型适配入口
              </li>
            </ul>
            <details>
              <summary>
                与参考机制有哪些区别？
                <ChevronRight size={15} />
              </summary>
              <p>
                这里的编译产物是 JSON IR，Worker 消息使用结构化数据。没有复刻 ChatGPT 的完整
                DIL、二进制协议、跨域执行沙箱或 AppBlock。页面实验用于解释本项目的实现，不代表
                ChatGPT 内部架构或官方产品能力。
              </p>
            </details>
            <details>
              <summary>
                状态、数据和安全边界
                <ChevronRight size={15} />
              </summary>
              <p>
                状态可跨同一回复的重编译保留，刷新后重置。遥测为固定模拟数据。白名单和 Worker
                并不替代生产环境的鉴权、数据校验与运行隔离；项目当前定位为概念验证。
              </p>
            </details>
            <div className="s-references">
              <span>延伸阅读 / 灵感来源</span>
              <a
                href="https://www.openui.com/blog/how-chatgpt-intelligent-ui-works"
                target="_blank"
                rel="noreferrer"
              >
                OpenUI · How ChatGPT Intelligent UI works
                <ArrowUpRight size={13} />
              </a>
              <a
                href="https://kejun.github.io/demos/chatgpt-intelligent-ui/"
                target="_blank"
                rel="noreferrer"
              >
                参考：ChatGPT 智能 UI · 机制观察室
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="s-footer s-container">
        <Brand />
        <p>Understand the system. Then make it your own.</p>
        <a href="#top">
          回到顶部
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
