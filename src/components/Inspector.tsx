import { useState } from 'react';
import {
  Braces,
  Check,
  Code2,
  Copy,
  Database,
  FileCode2,
  Play,
  Radio,
  ScanLine,
  Terminal,
  X,
} from 'lucide-react';
import type { Turn } from '../lib/models';

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code-block">
      <code>
        {code.split('\n').map((line, index) => (
          <div className="code-line" key={index}>
            <span className="line-number" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              {line.split(/("[^"]*"|<\/?[\w]+|\{@\w+|\b(?:true|false|null)\b)/g).map((token, i) => (
                <span
                  key={i}
                  className={
                    token.startsWith('"')
                      ? 'code-string'
                      : token.startsWith('<') || token.startsWith('{@')
                        ? 'code-keyword'
                        : /^(true|false|null)$/.test(token)
                          ? 'code-value'
                          : ''
                  }
                >
                  {token}
                </span>
              ))}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

export function Inspector({
  turn,
  onClose,
  onCompile,
  notify,
}: {
  turn?: Turn;
  onClose: () => void;
  onCompile: (source: string) => Promise<void>;
  notify: (message: string) => void;
}) {
  const [tab, setTab] = useState('source');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [compiling, setCompiling] = useState(false);
  const tabs = [
    { id: 'source', label: '源码', icon: Code2 },
    { id: 'runtime', label: '运行时', icon: Braces },
    { id: 'data', label: '数据', icon: Database },
    { id: 'events', label: '事件', icon: Radio },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(turn?.source ?? '');
      notify('DSL 已复制');
    } catch {
      notify('无法访问剪贴板，请手动复制');
    }
  };
  const run = async () => {
    setCompiling(true);
    try {
      await onCompile(draft);
      setEditing(false);
    } catch {
      /* The parent presents the API error; retain the draft. */
    } finally {
      setCompiling(false);
    }
  };
  return (
    <aside className="inspector" aria-label="开发者面板">
      <div className="inspector-heading">
        <div>
          <ScanLine size={17} />
          <strong>开发者面板</strong>
          <span>INSPECTOR</span>
        </div>
        <button className="icon-button" aria-label="关闭开发者面板" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="检查内容">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setEditing(false);
            }}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>
      {!turn ? (
        <div className="inspector-empty">
          <div>
            <FileCode2 size={30} />
          </div>
          <h3>看看界面背后发生了什么</h3>
          <p>生成一个界面，查看 DSL 源码、编译结果、Worker 状态与真实事件。</p>
          <span>每一步，都可以观察。</span>
        </div>
      ) : (
        <div className="inspector-body" role="tabpanel">
          <div className="inspector-status">
            <span className={`status-dot ${turn.status === 'streaming' ? 'pulsing' : ''}`} />
            {turn.status === 'streaming'
              ? '正在接收流式响应'
              : turn.status === 'error'
                ? '响应遇到错误'
                : '运行时就绪'}
            <code>dil-poc / v1</code>
          </div>
          {tab === 'source' && (
            <>
              <div className="pane-toolbar">
                <span>
                  <FileCode2 size={13} />
                  response.dil
                </span>
                <div>
                  <button
                    disabled={turn.status === 'streaming'}
                    onClick={() => {
                      setEditing(!editing);
                      setDraft(turn.source);
                    }}
                  >
                    {editing ? '取消' : '编辑'}
                  </button>
                  <button title="复制 DSL" aria-label="复制 DSL" onClick={copy}>
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              {editing ? (
                <div className="source-editor">
                  <textarea
                    aria-label="编辑 DSL 源码"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                  />
                  <button className="small-primary" disabled={compiling} onClick={() => void run()}>
                    <Play size={13} />
                    {compiling ? '编译中…' : '编译并应用'}
                  </button>
                  <p>沿用相同名称的状态；修改初始值不会重置已调整的状态。</p>
                </div>
              ) : (
                <CodeBlock code={turn.source || '// 等待第一个片段…'} />
              )}
              <div className="diagnostics">
                <h4>
                  {turn.compilation?.diagnostics.length ? (
                    '编译诊断'
                  ) : (
                    <>
                      <Check size={14} />
                      组件校验通过
                    </>
                  )}
                </h4>
                {turn.compilation?.diagnostics.map((d, i) => (
                  <div
                    className={d.recovery ? 'diagnostic-recovery' : 'diagnostic-warning'}
                    key={i}
                  >
                    <code>{d.code}</code>
                    <span>{d.message}</span>
                  </div>
                ))}
              </div>
              <details className="inspector-details">
                <summary>查看编译后的程序 IR</summary>
                <CodeBlock code={JSON.stringify(turn.compilation?.program ?? {}, null, 2)} />
              </details>
            </>
          )}
          {tab === 'runtime' && (
            <>
              <div className="runtime-metrics">
                <div>
                  <span>模型调用</span>
                  <strong>
                    {turn.modelCalls}
                    <small>次</small>
                  </strong>
                </div>
                <div>
                  <span>本地交互</span>
                  <strong>
                    {turn.interactions}
                    <small>次</small>
                  </strong>
                </div>
                <div>
                  <span>本次计算</span>
                  <strong>
                    {(turn.report?.duration ?? 0).toFixed(2)}
                    <small>ms</small>
                  </strong>
                </div>
              </div>
              <div className="inspector-section">
                <h4>
                  KEYED STATE <span>Worker 内的当前值</span>
                </h4>
                {Object.keys(turn.report?.state ?? {}).length ? (
                  <div className="state-list">
                    {Object.entries(turn.report!.state).map(([key, value]) => (
                      <div key={key}>
                        <code>{key}</code>
                        <span
                          className={typeof value === 'boolean' ? 'state-bool' : 'state-number'}
                        >
                          {JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-small">程序还没有声明状态。</p>
                )}
              </div>
              <div className="inspector-section">
                <h4>
                  RENDER OPERATIONS <span>累计 {turn.operationCount} 条</span>
                </h4>
                <p className="muted-small">最近一次产生界面变化的操作。调整控件观察 SET 更新。</p>
                <CodeBlock
                  code={
                    turn.lastOperations.length
                      ? turn.lastOperations.map((op) => JSON.stringify(op)).join('\n')
                      : '// 尚无界面变化'
                  }
                />
              </div>
              {!!turn.report?.diagnostics.length && (
                <div className="diagnostics">
                  <h4>运行时诊断</h4>
                  {turn.report.diagnostics.map((message, i) => (
                    <div className="diagnostic-warning" key={i}>
                      {message}
                    </div>
                  ))}
                </div>
              )}
              <div className="runtime-note">
                <Terminal size={15} />
                <p>状态更新与树差异计算都在 Web Worker 内完成。组件事件只回传处理器 ID 和参数。</p>
              </div>
            </>
          )}
          {tab === 'data' && (
            <>
              <div className="inspector-section">
                <h4>
                  APP DATA <span>服务端独立传入 · 模拟数据</span>
                </h4>
                <p className="muted-small">DSL 通过 data.* 引用。数据不需要由模型重写。</p>
                <CodeBlock code={JSON.stringify(turn.appData, null, 2)} />
              </div>
              <details className="inspector-details">
                <summary>
                  文本常量 · {Object.keys(turn.compilation?.constants ?? {}).length} 项
                </summary>
                <CodeBlock code={JSON.stringify(turn.compilation?.constants ?? {}, null, 2)} />
              </details>
            </>
          )}
          {tab === 'events' && (
            <>
              <div className="inspector-section">
                <h4>
                  EVENT STREAM <span>{turn.chunks} 个流式片段</span>
                </h4>
                <p className="muted-small">记录最近 100 条编译、数据与交互事件。</p>
              </div>
              <div className="event-list">
                {[...turn.events].reverse().map((event) => (
                  <div key={event.id}>
                    <div>
                      <span className={`event-kind kind-${event.kind}`}>{event.kind}</span>
                      <time>{event.time}</time>
                    </div>
                    <p>{event.detail}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="inspector-footer">
        <span className="status-dot" />
        受限表达式解释器<span>无 eval · 无动态代码</span>
      </div>
    </aside>
  );
}
