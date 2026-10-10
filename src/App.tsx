import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  FlaskConical,
  Layers,
  LoaderCircle,
  Menu,
  MessageSquare,
  PanelRight,
  Network,
  Server,
  Plus,
  Settings2,
  Sparkles,
  Square,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { Inspector } from './components/Inspector';
import { ArchitecturePage, CatalogPage } from './components/InfoPages';
import { LiveInterface } from './components/LiveInterface';
import type { Compilation, RuntimeResult, StreamEvent } from './core/types';
import { readSSE } from './lib/sse';
import { catalog } from './core/catalog';
import { describeViewContext, withViewContext } from './core/context';
import { examples, type EventLog, type Scenario, type Turn } from './lib/models';

function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? 'brand-mark-small' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M16 5v22M5 16h22M8.3 8.3l15.4 15.4M8.3 23.7 23.7 8.3"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function ExampleArt({ type }: { type: Scenario }) {
  if (type === 'rack')
    return (
      <div className="example-art art-rack" aria-hidden="true">
        <div className="mini-rack">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className={n === 3 ? 'mini-rack-alert' : ''}>
              <i />
              <span />
              <span />
              <span />
              <b />
            </div>
          ))}
        </div>
        <div className="mini-rack-summary">
          <span>RACK A01</span>
          <strong>
            8 <small>DEVICES</small>
          </strong>
          <p>
            <i />4 active alerts
          </p>
          <span>42U · 6.5 kW</span>
        </div>
      </div>
    );
  if (type === 'gpu')
    return (
      <div className="example-art art-gpu" aria-hidden="true">
        <div className="mini-gpu-title">
          <Cpu size={16} />
          <span>GPU CLUSTER</span>
          <b>8 CARDS</b>
        </div>
        <div className="mini-gpu-cells">
          {[67, 73, 86, 71, 65, 71, 67, 69].map((n, i) => (
            <span className={n > 80 ? 'mini-hot' : ''} key={i}>
              <i />
              {n}°
            </span>
          ))}
        </div>
      </div>
    );
  return (
    <div className="example-art art-network" aria-hidden="true">
      <div className="mini-gpu-title">
        <Network size={16} />
        <span>NETWORK FABRIC</span>
      </div>
      <div className="mini-port-cells">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} className={i === 22 ? 'mini-down' : i === 23 ? 'mini-warn' : ''} />
        ))}
      </div>
      <div className="mini-network-caption">
        <span>TOR-A01-B</span>
        <b>1 link down</b>
      </div>
    </div>
  );
}

function ModelDialog({
  onClose,
  available,
  model,
}: {
  onClose: () => void;
  available: boolean;
  model?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="model-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="dialog-icon">
          <Cpu size={23} />
        </span>
        <button className="icon-button" aria-label="关闭模型设置" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <h2>连接你的模型</h2>
      <p>默认演示模式无需 Key。连接支持 Chat Completions 流式接口的模型后，即可自由生成界面。</p>
      <div className={`connection-status ${available ? 'connected' : ''}`}>
        <span className="status-dot" />
        {available ? `已配置 · ${model}` : '当前使用演示模式 · 模板生成'}
      </div>
      <ol>
        <li>
          在项目根目录复制 <code>.env.example</code> 为 <code>.env</code>。
        </li>
        <li>设置你的服务地址、API Key 和模型名称。</li>
        <li>
          重启 <code>npm run dev</code>，刷新页面并切换“真实模型”。
        </li>
      </ol>
      <pre>
        LLM_BASE_URL=https://api.openai.com/v1{'\n'}LLM_API_KEY=你的密钥{'\n'}LLM_MODEL=你的模型名称
      </pre>
      <small>密钥仅在本地服务端使用，不会发送给浏览器。</small>
      <button className="dialog-done" onClick={onClose}>
        知道了
        <Check size={16} />
      </button>
    </dialog>
  );
}

export default function App() {
  const [page, setPage] = useState<'playground' | 'catalog' | 'architecture'>('playground');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [busy, setBusy] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState('');
  const [config, setConfig] = useState<{ liveAvailable: boolean; model?: string }>({
    liveAvailable: false,
  });
  const [apiError, setApiError] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const logId = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setConfig)
      .catch(() => setApiError(true));
    return () => activeRequest.current?.abort();
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (!composer.current) return;
    composer.current.style.height = 'auto';
    composer.current.style.height = `${Math.min(composer.current.scrollHeight, 160)}px`;
  }, [prompt]);

  const updateTurn = useCallback(
    (id: string, update: (turn: Turn) => Turn) =>
      setTurns((items) => items.map((turn) => (turn.id === id ? update(turn) : turn))),
    [],
  );
  const log = (kind: string, detail: string): EventLog => ({
    id: ++logId.current,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    kind,
    detail,
  });
  const appendLog = (turn: Turn, event: EventLog) => [...turn.events, event].slice(-100);
  const selectTurn = (id: string) => {
    setSelectedId(id);
    setInspectorOpen(true);
  };
  const scrollBottom = () => {
    const el = conversation.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  async function send(text: string, scenario?: Scenario, contextSource?: string) {
    if (!text.trim() || activeRequest.current || text.length > 4000) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = crypto.randomUUID();
    const contextTurn =
      scenario && !contextSource
        ? undefined
        : (turns.find((turn) => turn.id === (contextSource ?? selectedId)) ?? turns.at(-1));
    const context = contextTurn?.report?.context ?? contextTurn?.context;
    const previous = contextTurn?.scenario ?? turns.at(-1)?.scenario;
    const history = turns
      .filter((turn) => turn.status === 'done')
      .slice(-5)
      .flatMap((turn) => [
        { role: 'user', content: withViewContext(turn.prompt, turn.context) },
        { role: 'assistant', content: turn.source },
      ]);
    const turn: Turn = {
      id,
      prompt: text.trim(),
      context,
      source: '',
      mode,
      model: '',
      scenario,
      status: 'streaming',
      appData: {},
      duration: 0,
      chunks: 0,
      modelCalls: 0,
      interactions: 0,
      operationCount: 0,
      lastOperations: [],
      events: [],
      view: 'native',
    };
    setTurns((items) => [...items, turn]);
    setSelectedId(id);
    setPrompt('');
    setBusy(true);
    setPage('playground');
    setMobileMenu(false);
    requestAnimationFrame(() =>
      document.getElementById(`turn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
    let terminal = false;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: text.trim(),
          mode,
          scenario: scenario ?? previous,
          history,
          context,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      if (!response.body) throw new Error('服务端没有返回流式响应');
      for await (const data of readSSE(response.body)) {
        if (controller.signal.aborted) break;
        const event = JSON.parse(data) as StreamEvent;
        if (event.type === 'meta')
          updateTurn(id, (current) => ({
            ...current,
            mode: event.mode,
            model: event.model,
            modelCalls: event.modelCalls,
            scenario: event.scenario as Scenario,
            events: appendLog(
              current,
              log(
                'START',
                event.mode === 'demo'
                  ? '演示模板开始流式输出 · 0 次模型调用'
                  : `模型开始生成 · ${event.model}`,
              ),
            ),
          }));
        if (event.type === 'data')
          updateTurn(id, (current) => ({
            ...current,
            appData: event.appData,
            events: appendLog(current, log('DATA', '服务端独立传入 appData 模拟数据')),
          }));
        if (event.type === 'patch')
          updateTurn(id, (current) => ({
            ...current,
            source: current.source + event.append,
            compilation: { ...current.compilation, ...event.delta } as Compilation,
            chunks: event.sequence,
            events: appendLog(
              current,
              log(
                event.update.toUpperCase(),
                `${event.append.length} 字符 · ${event.update === 'program' ? '替换编译程序' : event.update === 'constants' ? '仅更新常量表' : '等待完整语法结构'}`,
              ),
            ),
          }));
        if (event.type === 'done') {
          terminal = true;
          updateTurn(id, (current) => ({
            ...current,
            status: 'done',
            duration: event.duration,
            events: appendLog(
              current,
              log('DONE', `生成完成 · ${(event.duration / 1000).toFixed(2)}s`),
            ),
          }));
        }
        if (event.type === 'error') {
          terminal = true;
          throw new Error(event.message);
        }
      }
      if (!terminal && !controller.signal.aborted)
        throw new Error('连接已中断，保留已生成内容，请重试');
    } catch (error) {
      updateTurn(id, (current) => ({
        ...current,
        status: controller.signal.aborted ? 'stopped' : 'error',
        error: controller.signal.aborted ? undefined : (error as Error).message,
        events: appendLog(
          current,
          log(
            controller.signal.aborted ? 'STOP' : 'ERROR',
            controller.signal.aborted ? '用户停止生成，保留已生成界面' : (error as Error).message,
          ),
        ),
      }));
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setBusy(false);
      }
    }
  }

  const result = (id: string, report: RuntimeResult, interaction: boolean) => {
    if (interaction && !report.action) setSelectedId(id);
    updateTurn(id, (current) => ({
      ...current,
      report,
      interactions: current.interactions + (interaction ? 1 : 0),
      operationCount: current.operationCount + report.operations.length,
      lastOperations: report.operations.length ? report.operations : current.lastOperations,
      events: interaction
        ? appendLog(
            current,
            log(
              report.action ? 'ACTION' : 'LOCAL',
              report.action
                ? `${report.action.type}(${report.action.text})`
                : `${report.operations.length} 条 UI 操作 · ${report.duration.toFixed(2)}ms · 无模型调用`,
            ),
          )
        : current.events,
    }));
  };
  const action = async (id: string, value: NonNullable<RuntimeResult['action']>) => {
    if (value.type === 'issueNewTurn') await send(value.text, undefined, id);
    else {
      try {
        await navigator.clipboard.writeText(value.text);
        setToast('已复制到剪贴板');
      } catch {
        setToast('无法访问剪贴板，请手动复制');
      }
    }
  };
  const reset = () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setBusy(false);
    setTurns([]);
    setSelectedId(undefined);
    setPrompt('');
    setPage('playground');
    setMobileMenu(false);
    composer.current?.focus();
  };
  const selected = turns.find((turn) => turn.id === selectedId) ?? turns.at(-1);
  const compileSource = async (source: string) => {
    if (!selected) return;
    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      updateTurn(selected.id, (current) => ({
        ...current,
        source,
        compilation: data.compilation,
        appData: data.appData,
        events: appendLog(current, log('EDIT', '手动编辑源码并重新编译，保留已有状态')),
      }));
      setToast('已重新编译并应用');
    } catch (error) {
      setToast((error as Error).message);
      throw error;
    }
  };
  const copySource = async (source: string) => {
    try {
      await navigator.clipboard.writeText(source);
      setToast('已复制 DSL 源码');
    } catch {
      setToast('无法访问剪贴板，请打开开发者面板手动复制');
    }
  };

  const composerView = (
    <form
      className="composer"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void send(prompt);
      }}
    >
      {describeViewContext(selected?.report?.context) && (
        <div className="composer-context" title={describeViewContext(selected?.report?.context)}>
          <Layers size={12} />
          <span>当前视图：{describeViewContext(selected?.report?.context)}</span>
        </div>
      )}
      <textarea
        ref={composer}
        aria-label="描述你想要的交互界面"
        placeholder={
          turns.length
            ? '继续分析某台设备，或描述新的监控需求…'
            : '例如：查看 Rack A01 的机架总览，找出需要关注的设备…'
        }
        value={prompt}
        maxLength={4000}
        rows={1}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void send(prompt);
          }
        }}
      />
      <div className="composer-bottom">
        <div className="composer-mode">
          <span className={`mode-dot ${mode === 'live' ? 'live' : ''}`} />
          <select
            aria-label="生成模式"
            value={mode}
            disabled={busy}
            onChange={(e) => setMode(e.target.value as 'demo' | 'live')}
          >
            <option value="demo">演示模式</option>
            <option value="live" disabled={!config.liveAvailable}>
              真实模型{config.liveAvailable ? '' : ' · 未配置'}
            </option>
          </select>
          <ChevronDown size={12} />
          <span className="composer-mode-note">
            {mode === 'demo' ? '无需 API Key' : config.model}
          </span>
        </div>
        <div className="composer-actions">
          <span>{prompt.length > 3600 ? `${prompt.length}/4000` : '↵ 发送'}</span>
          {busy ? (
            <button
              type="button"
              className="send-button stop-button"
              onClick={() => activeRequest.current?.abort()}
              aria-label="停止生成"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              type="submit"
              disabled={!prompt.trim()}
              aria-label="发送描述"
            >
              <ArrowUp size={19} />
            </button>
          )}
        </div>
      </div>
    </form>
  );

  return (
    <div className={`app-shell ${mobileMenu ? 'mobile-menu-open' : ''}`}>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="关闭导航"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('playground');
          }}
        >
          <Logo />
          <div>
            <strong>
              Private<span>Cloud</span>
              <b>LAB</b>
            </strong>
            <small>Dell infrastructure · UI Lab</small>
          </div>
        </a>
        <button className="new-chat" onClick={reset}>
          <Plus size={16} />
          新建对话<span>NEW</span>
        </button>
        <nav aria-label="主导航">
          <button
            className={page === 'playground' ? 'active' : ''}
            onClick={() => {
              setPage('playground');
              setMobileMenu(false);
            }}
          >
            <WandSparkles size={17} />
            智能监控
            <span className="nav-active-dot" />
          </button>
          <button
            className={page === 'catalog' ? 'active' : ''}
            onClick={() => {
              setPage('catalog');
              setMobileMenu(false);
            }}
          >
            <Box size={17} />
            组件目录<span className="nav-count">{Object.keys(catalog).length}</span>
          </button>
          <button
            className={page === 'architecture' ? 'active' : ''}
            onClick={() => {
              setPage('architecture');
              setMobileMenu(false);
            }}
          >
            <Layers size={17} />
            架构说明
          </button>
        </nav>
        <div className="sidebar-section-label">
          从示例开始<span>EXPLORE</span>
        </div>
        <div className="sidebar-examples">
          {examples.map((example, index) => {
            const Icon = [Server, Cpu, Network][index];
            return (
              <button
                key={example.id}
                disabled={busy}
                onClick={() => void send(example.prompt, example.id)}
              >
                <Icon size={15} />
                {example.title}
                <ArrowUpRight size={13} />
              </button>
            );
          })}
        </div>
        {!!turns.length && (
          <>
            <div className="sidebar-section-label">
              当前对话<span>{String(turns.length).padStart(2, '0')}</span>
            </div>
            <div className="conversation-list">
              {turns.map((turn) => (
                <button
                  key={turn.id}
                  className={selectedId === turn.id ? 'selected' : ''}
                  onClick={() => {
                    setPage('playground');
                    setSelectedId(turn.id);
                    setMobileMenu(false);
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`turn-${turn.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    );
                  }}
                >
                  <MessageSquare size={14} />
                  <span>{turn.prompt}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-icon">
              <Zap size={17} />
            </span>
            <strong>生成一次，交互无数次</strong>
            <p>调整控件，无需再次调用模型。</p>
            <button onClick={() => setPage('architecture')}>
              了解工作原理
              <ArrowRight size={13} />
            </button>
          </div>
          <a
            href="https://www.openui.com/blog/how-chatgpt-intelligent-ui-works"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={15} />
            参考文章
            <ExternalLink size={12} />
          </a>
          <div className="sidebar-version">
            <span>
              <i />
              LOCAL WORKSPACE
            </span>
            <code>v0.1.0</code>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu-button"
              aria-label="打开导航"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={19} />
            </button>
            <span>Dell Private Cloud</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'playground' ? '智能监控' : page === 'catalog' ? '组件目录' : '架构说明'}
            </strong>
            <span className="poc-badge">POC</span>
          </div>
          <div className="topbar-actions">
            <span className="server-status">
              <span className={`status-dot ${apiError ? 'status-error' : ''}`} />
              {apiError ? '服务未连接' : '本地运行'}
            </span>
            <button
              className="icon-button settings-button"
              aria-label="连接模型"
              title="连接模型"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={17} />
            </button>
            <button
              className={`inspector-toggle ${inspectorOpen ? 'selected' : ''}`}
              onClick={() => setInspectorOpen(!inspectorOpen)}
            >
              <PanelRight size={15} />
              <span>开发者面板</span>
            </button>
          </div>
        </header>
        <div className="workspace-body">
          <main
            className={`main-content ${turns.length && page === 'playground' ? 'has-conversation' : ''}`}
          >
            {page !== 'playground' && (
              <div className="info-scroll">
                {page === 'catalog' ? <CatalogPage /> : <ArchitecturePage />}
              </div>
            )}
            <div className="playground-pane" hidden={page !== 'playground'}>
              {turns.length > 0 && <h1 className="sr-only">Intelligent UI 交互对话</h1>}
              <div
                className="conversation-scroll"
                ref={conversation}
                onScroll={() => {
                  const el = conversation.current;
                  if (el) setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 260);
                }}
              >
                {!turns.length ? (
                  <div className="welcome">
                    <div className="welcome-eyebrow">
                      <span>
                        <FlaskConical size={13} />
                        PRIVATE CLOUD OBSERVABILITY
                      </span>
                      <i />
                      Intelligent UI · POC
                    </div>
                    <div className="welcome-symbol">
                      <Logo />
                      <span className="orbit orbit-one" />
                      <span className="orbit orbit-two" />
                      <span className="floating-shape shape-one">
                        <Code2 size={15} />
                      </span>
                      <span className="floating-shape shape-two">
                        <Sparkles size={15} />
                      </span>
                    </div>
                    <h1>
                      从机架到 GPU，<span>一目了然。</span>
                    </h1>
                    <p className="welcome-description">
                      用自然语言，生成你的私有云监控视图。
                      <br />
                      查看设备状态、追踪指标变化，让每一次下钻都有依据。
                    </p>
                    <div className="example-section-title">
                      <span>选择一个监控场景</span>
                      <span>
                        或描述你的监控需求 <ArrowDown size={12} />
                      </span>
                    </div>
                    <div className="example-cards">
                      {examples.map((example) => (
                        <button
                          className="example-card"
                          key={example.id}
                          onClick={() => void send(example.prompt, example.id)}
                        >
                          <ExampleArt type={example.id} />
                          <div className="example-card-title">
                            <h2>{example.title}</h2>
                            <ArrowUpRight size={15} />
                          </div>
                          <p>{example.description}</p>
                          <span className="example-tag">{example.tag}</span>
                        </button>
                      ))}
                    </div>
                    <div className="welcome-composer">{composerView}</div>
                    <div className="welcome-footnote">
                      <span>
                        <Check size={12} />
                        模拟遥测，打开即用
                      </span>
                      <span>
                        <Cpu size={12} />
                        交互在本地即时计算
                      </span>
                      <button onClick={() => setSettings(true)}>
                        接入真实模型
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                    <div className="pipeline-strip">
                      <span>
                        <Sparkles size={14} />
                        描述需求
                      </span>
                      <i />
                      <span>
                        <Code2 size={14} />
                        流式编译
                      </span>
                      <i />
                      <span>
                        <Cpu size={14} />
                        Worker 执行
                      </span>
                      <i />
                      <span>
                        <Activity size={14} />
                        即时交互
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="turn-list">
                    {turns.map((turn, index) => (
                      <article className="turn" id={`turn-${turn.id}`} key={turn.id}>
                        <div className="user-message">
                          <span>你</span>
                          <p>{turn.prompt}</p>
                          {describeViewContext(turn.context) && (
                            <small className="attached-context">
                              已带入：{describeViewContext(turn.context)}
                            </small>
                          )}
                        </div>
                        <div className="assistant-heading">
                          <div>
                            <Logo small />
                            <h2>Private Cloud Assistant</h2>
                            <span>{turn.mode === 'demo' ? 'DEMO' : 'MODEL'}</span>
                          </div>
                          <button
                            className="inspect-message"
                            aria-label={`检查第 ${index + 1} 个界面`}
                            onClick={() => selectTurn(turn.id)}
                          >
                            <Code2 size={14} />
                            检查界面
                          </button>
                        </div>
                        <div className="assistant-body">
                          <div hidden={turn.view !== 'native'}>
                            <LiveInterface
                              compilation={turn.compilation}
                              appData={turn.appData}
                              disabled={busy}
                              onResult={(report, interaction) =>
                                result(turn.id, report, interaction)
                              }
                              onAction={(value) => void action(turn.id, value)}
                            />
                          </div>
                          {turn.view === 'markdown' && (
                            <div className="markdown-fallback">
                              <span>静态 Markdown 回退 · 交互计算值不包含在内</span>
                              <pre>{turn.compilation?.fallbackMarkdown || '等待生成内容…'}</pre>
                            </div>
                          )}
                          {turn.status === 'streaming' && (
                            <div className="generation-status" role="status">
                              <LoaderCircle size={14} />
                              {turn.source
                                ? '界面正在生长，你已经可以调整出现的控件…'
                                : '正在构建你的交互界面…'}
                              <span>{turn.chunks} chunks</span>
                            </div>
                          )}
                          {turn.error && (
                            <div className="response-error" role="alert">
                              <CircleHelp size={16} />
                              <span>{turn.error}</span>
                              <button
                                disabled={busy}
                                onClick={() => void send(turn.prompt, turn.scenario, turn.id)}
                              >
                                重试
                              </button>
                            </div>
                          )}
                          {turn.status === 'stopped' && (
                            <div className="stopped-label">已停止生成，保留已完成的内容。</div>
                          )}
                          {turn.source && (
                            <div className="response-toolbar">
                              <div className="view-switch" aria-label="响应视图">
                                <button
                                  className={turn.view === 'native' ? 'active' : ''}
                                  onClick={() =>
                                    updateTurn(turn.id, (current) => ({
                                      ...current,
                                      view: 'native',
                                    }))
                                  }
                                >
                                  <Layers size={12} />
                                  交互界面
                                </button>
                                <button
                                  className={turn.view === 'markdown' ? 'active' : ''}
                                  onClick={() =>
                                    updateTurn(turn.id, (current) => ({
                                      ...current,
                                      view: 'markdown',
                                    }))
                                  }
                                >
                                  Markdown
                                </button>
                              </div>
                              <div className="response-meta">
                                <span>
                                  <Zap size={11} />
                                  {turn.interactions} 次本地交互
                                </span>
                                {turn.duration > 0 && (
                                  <span>{(turn.duration / 1000).toFixed(1)}s</span>
                                )}
                                <button
                                  className="icon-button"
                                  title="复制源码"
                                  aria-label={`复制第 ${index + 1} 个界面源码`}
                                  onClick={() => void copySource(turn.source)}
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
              {!!turns.length && (
                <div className="conversation-composer">
                  <div>
                    {showScroll && (
                      <button
                        className="scroll-bottom"
                        aria-label="滚动到底部"
                        onClick={scrollBottom}
                      >
                        <ArrowDown size={16} />
                      </button>
                    )}
                    {composerView}
                    <p>
                      {mode === 'demo'
                        ? '模拟遥测快照 · 尚未连接 Dell 设备 · 支持机架、GPU、交换机三类场景。'
                        : '真实模型可能生成无效 DSL；可在开发者面板查看诊断并编辑。'}
                      <span>Shift + Enter 换行</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
          {inspectorOpen && (
            <Inspector
              key={selected?.id ?? 'empty'}
              turn={selected}
              onClose={() => setInspectorOpen(false)}
              onCompile={compileSource}
              notify={setToast}
            />
          )}
        </div>
      </div>
      {settings && (
        <ModelDialog
          available={config.liveAvailable}
          model={config.model}
          onClose={() => setSettings(false)}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </div>
  );
}
