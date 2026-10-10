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
  Globe,
  Layers,
  LoaderCircle,
  Menu,
  MessageSquare,
  Network,
  PanelRight,
  Plus,
  Server,
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
import type { EventLog, Scenario, Turn } from './lib/models';
import { I18nProvider, useI18n } from './i18n';

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
        <div className="mini-gpu-foot">
          <span>H100 · SXM5</span>
          <b>≥ 80°C</b>
        </div>
      </div>
    );
  return (
    <div className="example-art art-network" aria-hidden="true">
      <div className="mini-switch-title">
        <Network size={16} />
        <span>TOR SWITCH</span>
        <b>TOR-A01-A</b>
      </div>
      <div className="mini-switch-ports">
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className={i === 4 ? 'mini-port-down' : i % 3 === 0 ? 'mini-port-active' : ''}
          />
        ))}
      </div>
      <div className="mini-switch-foot">
        <span>48 × 25G</span>
        <b>1 LINK DOWN</b>
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
  const { t } = useI18n();
  const m = t.app.modelModal;
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
        <button className="icon-button" aria-label={m.close} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <h2>{m.title}</h2>
      <p>{m.desc}</p>
      <div className={`connection-status ${available ? 'connected' : ''}`}>
        <span className="status-dot" />
        {available ? m.configured(model || '') : m.demoMode}
      </div>
      <ol>
        <li>{m.step1}</li>
        <li>{m.step2}</li>
        <li>{m.step3}</li>
      </ol>
      <pre>
        LLM_BASE_URL=https://api.openai.com/v1{'\n'}LLM_API_KEY=your_key{'\n'}LLM_MODEL=gpt-4o-mini
      </pre>
      <small>{m.notice}</small>
      <button className="dialog-done" onClick={onClose}>
        {m.close}
        <Check size={16} />
      </button>
    </dialog>
  );
}

function AppInner() {
  const { t, lang, toggleLang } = useI18n();
  const [page, setPage] = useState<'playground' | 'catalog' | 'architecture'>('playground');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState<string>();
  const [showScroll, setShowScroll] = useState(false);
  const [config, setConfig] = useState<{ liveAvailable: boolean; model: string }>({
    liveAvailable: false,
    model: 'gpt-4o-mini',
  });
  const [apiError, setApiError] = useState(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setConfig({
          liveAvailable: Boolean(data.liveAvailable),
          model: data.model || 'gpt-4o-mini',
        });
        if (data.liveAvailable) setMode('live');
        setApiError(false);
      })
      .catch(() => setApiError(true));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const selected = turns.find((t) => t.id === selectedId) ?? turns.at(-1);

  const scrollBottom = () => {
    const el = conversation.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  const updateTurn = useCallback((id: string, updater: (turn: Turn) => Turn) => {
    setTurns((current) =>
      current.map((turn) => {
        if (turn.id !== id) return turn;
        return updater(turn);
      }),
    );
  }, []);

  const selectTurn = (id: string) => {
    setSelectedId(id);
    setInspectorOpen(true);
  };

  const log = (kind: string, detail: string): EventLog => ({
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    kind,
    detail,
  });

  const appendLog = (turn: Turn, entry: EventLog): EventLog[] => [...turn.events.slice(-99), entry];

  async function send(text: string, scenario?: Scenario, anchorId?: string) {
    const content = text.trim();
    if (!content || busy) return;
    setPage('playground');
    setBusy(true);
    setPrompt('');
    const id = `turn-${Date.now()}`;
    const previous = turns.find((t) => t.id === anchorId) ?? turns.at(-1);
    const context = previous?.report?.context;
    const initialTurn: Turn = {
      id,
      prompt: content,
      context,
      source: '',
      mode,
      model: mode === 'demo' ? 'demo-presets' : config.model,
      scenario: scenario ?? previous?.scenario,
      status: 'streaming',
      appData: {},
      duration: 0,
      chunks: 0,
      modelCalls: 0,
      interactions: 0,
      operationCount: 0,
      lastOperations: [],
      events: [
        log('SEND', `${content.slice(0, 36)}${content.length > 36 ? '…' : ''}`),
        ...(context
          ? [log('CONTEXT', describeViewContext(context, lang) || 'attached context')]
          : []),
      ],
      view: 'native',
    };
    setTurns((current) => [...current, initialTurn]);
    setSelectedId(id);
    requestAnimationFrame(scrollBottom);

    const controller = new AbortController();
    activeRequest.current = controller;
    let terminal = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: withViewContext(content, context),
          mode,
          scenario,
          context,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? `HTTP ${response.status}`);
      }
      if (!response.body)
        throw new Error(lang === 'en' ? 'No stream returned' : '服务端没有返回流式响应');
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
                  ? lang === 'en'
                    ? 'Demo template streaming · 0 model calls'
                    : '演示模板开始流式输出 · 0 次模型调用'
                  : lang === 'en'
                    ? `Model generating · ${event.model}`
                    : `模型开始生成 · ${event.model}`,
              ),
            ),
          }));
        if (event.type === 'data')
          updateTurn(id, (current) => ({
            ...current,
            appData: event.appData,
            events: appendLog(
              current,
              log(
                'DATA',
                lang === 'en'
                  ? 'Server injected decoupled appData telemetry'
                  : '服务端独立传入 appData 模拟数据',
              ),
            ),
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
                lang === 'en'
                  ? `${event.append.length} chars · ${event.update === 'program' ? 'replaces program' : event.update === 'constants' ? 'updates constants' : 'waiting for full syntax'}`
                  : `${event.append.length} 字符 · ${event.update === 'program' ? '替换编译程序' : event.update === 'constants' ? '仅更新常量表' : '等待完整语法结构'}`,
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
              log(
                'DONE',
                lang === 'en'
                  ? `Generation completed · ${(event.duration / 1000).toFixed(2)}s`
                  : `生成完成 · ${(event.duration / 1000).toFixed(2)}s`,
              ),
            ),
          }));
        }
        if (event.type === 'error') {
          terminal = true;
          throw new Error(event.message);
        }
      }
      if (!terminal && !controller.signal.aborted)
        throw new Error(
          lang === 'en' ? 'Connection interrupted' : '连接已中断，保留已生成内容，请重试',
        );
    } catch (error) {
      updateTurn(id, (current) => ({
        ...current,
        status: controller.signal.aborted ? 'stopped' : 'error',
        error: controller.signal.aborted ? undefined : (error as Error).message,
        events: appendLog(
          current,
          log(
            controller.signal.aborted ? 'STOP' : 'ERROR',
            controller.signal.aborted
              ? lang === 'en'
                ? 'Generation stopped by user'
                : '用户停止生成，保留已生成界面'
              : (error as Error).message,
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
                : lang === 'en'
                  ? `${report.operations.length} UI ops · ${report.duration.toFixed(2)}ms · 0 model calls`
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
        setToast(t.app.toasts.copied);
      } catch {
        setToast(t.app.toasts.copyError);
      }
    }
  };

  const reset = () => {
    if (busy) activeRequest.current?.abort();
    setTurns([]);
    setSelectedId(undefined);
    setPrompt('');
    setMobileMenu(false);
  };

  const compileSource = async (source: string) => {
    if (!selected) return;
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? '编译失败');
    updateTurn(selected.id, (current) => ({
      ...current,
      source,
      compilation: body.compilation,
      appData: body.appData,
      events: appendLog(
        current,
        log(
          'EDIT',
          lang === 'en'
            ? 'Edited source and recompiled, keeping state'
            : '手动编辑源码并重新编译，保留已有状态',
        ),
      ),
    }));
    setToast(t.app.toasts.recompiled);
  };

  const copySource = async (source: string) => {
    try {
      await navigator.clipboard.writeText(source);
      setToast(t.app.toasts.copiedDsl);
    } catch {
      setToast(t.app.toasts.copyDslError);
    }
  };

  const composerView = (
    <form
      className="composer-form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void send(prompt);
      }}
    >
      {describeViewContext(selected?.report?.context, lang) && (
        <div
          className="composer-context"
          title={describeViewContext(selected?.report?.context, lang)}
        >
          <Layers size={12} />
          <span>
            {t.app.prompt.currentView}
            {describeViewContext(selected?.report?.context, lang)}
          </span>
        </div>
      )}
      <textarea
        ref={composer}
        aria-label={t.app.prompt.inputAria}
        placeholder={turns.length ? t.app.prompt.placeholderNext : t.app.prompt.placeholderDefault}
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
            aria-label={t.app.prompt.modeAria}
            value={mode}
            disabled={busy}
            onChange={(e) => setMode(e.target.value as 'demo' | 'live')}
          >
            <option value="demo">{t.app.prompt.modeDemo}</option>
            <option value="live" disabled={!config.liveAvailable}>
              {t.app.prompt.modeLive}
              {config.liveAvailable ? '' : t.app.prompt.notConfigured}
            </option>
          </select>
          <ChevronDown size={12} />
          <span className="composer-mode-note">
            {mode === 'demo' ? t.app.prompt.noKeyNeeded : config.model}
          </span>
        </div>
        <div className="composer-actions">
          <span>{prompt.length > 3600 ? `${prompt.length}/4000` : t.app.prompt.send}</span>
          {busy ? (
            <button
              type="button"
              className="send-button stop-button"
              onClick={() => activeRequest.current?.abort()}
              aria-label={t.app.prompt.stopAria}
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              type="submit"
              disabled={!prompt.trim()}
              aria-label={t.app.prompt.sendAria}
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
          aria-label={t.nav.menuClose}
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
          {t.app.sidebar.newChat}
          <span>{t.app.sidebar.newBadge}</span>
        </button>
        <nav aria-label={t.app.sidebar.mainNav}>
          <button
            className={page === 'playground' ? 'active' : ''}
            onClick={() => {
              setPage('playground');
              setMobileMenu(false);
            }}
          >
            <WandSparkles size={17} />
            {t.app.header.navPlayground}
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
            {t.app.header.navCatalog}
            <span className="nav-count">{Object.keys(catalog).length}</span>
          </button>
          <button
            className={page === 'architecture' ? 'active' : ''}
            onClick={() => {
              setPage('architecture');
              setMobileMenu(false);
            }}
          >
            <Layers size={17} />
            {t.app.header.navArchitecture}
          </button>
        </nav>
        <div className="sidebar-section-label">
          {t.app.sidebar.examplesLabel}
          <span>EXPLORE</span>
        </div>
        <div className="sidebar-examples">
          {t.examples.map((example, index) => {
            const Icon = [Server, Cpu, Network][index] ?? Server;
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
              {t.app.sidebar.currentChat}
              <span>{String(turns.length).padStart(2, '0')}</span>
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
            <strong>{t.app.sidebar.keyIdeaTitle}</strong>
            <p>{t.app.sidebar.keyIdeaDesc}</p>
            <button onClick={() => setPage('architecture')}>
              {t.app.sidebar.howItWorks}
              <ArrowRight size={13} />
            </button>
          </div>
          <a
            href="https://github.com/minatoaquaMK2/intelligent-ui/blob/main/docs/architecture.md"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={15} />
            {t.app.sidebar.referenceArticle}
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
              aria-label={t.nav.menuOpen}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={19} />
            </button>
            <span>Dell Private Cloud</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'playground'
                ? t.app.header.navPlayground
                : page === 'catalog'
                  ? t.app.header.navCatalog
                  : t.app.header.navArchitecture}
            </strong>
            <span className="poc-badge">POC</span>
          </div>
          <div className="topbar-actions">
            <span className="server-status">
              <span className={`status-dot ${apiError ? 'status-error' : ''}`} />
              {apiError ? t.app.header.statusOffline : t.app.header.statusOnline}
            </span>
            <button
              className="app-lang-toggle"
              onClick={toggleLang}
              aria-label={t.nav.toggleLang}
              title={t.nav.toggleLang}
            >
              <Globe size={14} />
              <span>{lang === 'zh' ? 'EN' : '中文'}</span>
            </button>
            <button
              className="icon-button settings-button"
              aria-label={t.app.header.connectModel}
              title={t.app.header.connectModel}
              onClick={() => setSettings(true)}
            >
              <Settings2 size={17} />
            </button>
            <button
              className={`inspector-toggle ${inspectorOpen ? 'selected' : ''}`}
              onClick={() => setInspectorOpen(!inspectorOpen)}
              aria-label={t.app.header.toggleDevPanel}
            >
              <PanelRight size={15} />
              <span>{t.app.header.devPanel}</span>
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
              {turns.length > 0 && <h1 className="sr-only">{t.app.chat.srTitle}</h1>}
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
                      {t.app.hero.titleLine1}
                      <span>{t.app.hero.titleHighlight}</span>
                    </h1>
                    <p className="welcome-description">
                      {t.app.hero.desc1}
                      <br />
                      {t.app.hero.desc2}
                    </p>
                    <div className="example-section-title">
                      <span>{t.app.hero.chooseScenario}</span>
                      <span>
                        {t.app.hero.orDescribe} <ArrowDown size={12} />
                      </span>
                    </div>
                    <div className="example-cards">
                      {t.examples.map((example) => (
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
                        {t.app.hero.pillSimulated}
                      </span>
                      <span>
                        <Cpu size={12} />
                        {t.app.hero.pillLocal}
                      </span>
                      <button onClick={() => setSettings(true)}>
                        {t.app.hero.pillLive}
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                    <div className="pipeline-strip">
                      <span>
                        <Sparkles size={14} />
                        {t.app.hero.stepDescribe}
                      </span>
                      <i />
                      <span>
                        <Code2 size={14} />
                        {t.app.hero.stepCompile}
                      </span>
                      <i />
                      <span>
                        <Cpu size={14} />
                        {t.app.hero.stepExecute}
                      </span>
                      <i />
                      <span>
                        <Activity size={14} />
                        {t.app.hero.stepInteract}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="turn-list">
                    {turns.map((turn, index) => (
                      <article className="turn" id={`turn-${turn.id}`} key={turn.id}>
                        <div className="user-message">
                          <span>{t.app.chat.userLabel}</span>
                          <p>{turn.prompt}</p>
                          {describeViewContext(turn.context, lang) && (
                            <small className="attached-context">
                              {t.app.chat.contextPrefix}
                              {describeViewContext(turn.context, lang)}
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
                            aria-label={t.app.chat.inspectAria(index + 1)}
                            onClick={() => selectTurn(turn.id)}
                          >
                            <Code2 size={14} />
                            {t.app.chat.inspectInterface}
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
                              <span>{t.app.chat.fallbackNotice}</span>
                              <pre>
                                {turn.compilation?.fallbackMarkdown || t.app.chat.waitingContent}
                              </pre>
                            </div>
                          )}
                          {turn.status === 'streaming' && (
                            <div className="generation-status" role="status">
                              <LoaderCircle size={14} />
                              {turn.source
                                ? t.app.chat.streamingHintGrowing
                                : t.app.chat.streamingHintBuilding}
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
                                {t.app.chat.retry}
                              </button>
                            </div>
                          )}
                          {turn.status === 'stopped' && (
                            <div className="stopped-label">{t.app.chat.stoppedLabel}</div>
                          )}
                          {turn.source && (
                            <div className="response-toolbar">
                              <div className="view-switch" aria-label={t.app.chat.viewSwitchAria}>
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
                                  {t.app.chat.viewNative}
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
                                  {t.app.chat.viewMarkdown}
                                </button>
                              </div>
                              <div className="response-meta">
                                <span>
                                  <Zap size={11} />
                                  {t.app.chat.interactionsCount(turn.interactions)}
                                </span>
                                {turn.duration > 0 && (
                                  <span>{(turn.duration / 1000).toFixed(1)}s</span>
                                )}
                                <button
                                  className="icon-button"
                                  title={t.app.chat.copySource}
                                  aria-label={t.app.chat.copySourceAria(index + 1)}
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
                        aria-label={t.app.chat.scrollToBottom}
                        onClick={scrollBottom}
                      >
                        <ArrowDown size={16} />
                      </button>
                    )}
                    {composerView}
                    <p>
                      {mode === 'demo' ? t.app.prompt.footerTipDemo : t.app.prompt.footerTipLive}
                      <span>{t.app.prompt.shiftEnterHint}</span>
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

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
