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
import { useI18n } from '../i18n';

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="code-block" tabIndex={0}>
      <code>{code}</code>
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
  const { t } = useI18n();
  const [tab, setTab] = useState('source');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [compiling, setCompiling] = useState(false);

  const tabs = [
    { id: 'source', label: t.inspector.tabSource, icon: Code2 },
    { id: 'runtime', label: t.inspector.tabRuntime, icon: Braces },
    { id: 'data', label: t.inspector.tabData, icon: Database },
    { id: 'events', label: t.inspector.tabEvents, icon: Radio },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(turn?.source ?? '');
      notify(t.inspector.copiedDsl);
    } catch {
      notify(t.inspector.copyError);
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
    <aside className="inspector" aria-label={t.inspector.title}>
      <div className="inspector-heading">
        <div>
          <ScanLine size={17} />
          <strong>{t.inspector.title}</strong>
          <span>INSPECTOR</span>
        </div>
        <button className="icon-button" aria-label={t.inspector.close} onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label={t.inspector.tabsAria}>
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
          <h3>{t.inspector.emptyTitle}</h3>
          <p>{t.inspector.emptyDesc}</p>
          <span>{t.inspector.emptyFooter}</span>
        </div>
      ) : (
        <div className="inspector-body" role="tabpanel">
          <div className="inspector-status">
            <span className={`status-dot ${turn.status === 'streaming' ? 'pulsing' : ''}`} />
            {turn.status === 'streaming'
              ? t.inspector.statusStreaming
              : turn.status === 'error'
                ? t.inspector.statusError
                : t.inspector.statusReady}
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
                    {editing ? t.inspector.cancel : t.inspector.edit}
                  </button>
                  <button
                    title={t.inspector.copyDsl}
                    aria-label={t.inspector.copyDsl}
                    onClick={copy}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
              {editing ? (
                <div className="source-editor">
                  <textarea
                    aria-label={t.inspector.editDslAria}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                  />
                  <button className="small-primary" disabled={compiling} onClick={() => void run()}>
                    <Play size={13} />
                    {compiling ? t.inspector.compiling : t.inspector.compileAndApply}
                  </button>
                  <p>{t.inspector.editNote}</p>
                </div>
              ) : (
                <CodeBlock code={turn.source || t.inspector.waitingFirstChunk} />
              )}
              <div className="diagnostics">
                <h4>
                  {turn.compilation?.diagnostics.length ? (
                    t.inspector.diagnosticsTitle
                  ) : (
                    <>
                      <Check size={14} />
                      {t.inspector.componentsPassed}
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
                <summary>{t.inspector.viewIrSummary}</summary>
                <CodeBlock code={JSON.stringify(turn.compilation?.program ?? {}, null, 2)} />
              </details>
            </>
          )}
          {tab === 'runtime' && (
            <>
              <div className="runtime-metrics">
                <div>
                  <span>{t.inspector.modelCalls}</span>
                  <strong>
                    {turn.modelCalls}
                    <small>{t.inspector.timesUnit}</small>
                  </strong>
                </div>
                <div>
                  <span>{t.inspector.localInteractions}</span>
                  <strong>
                    {turn.interactions}
                    <small>{t.inspector.timesUnit}</small>
                  </strong>
                </div>
                <div>
                  <span>{t.inspector.duration}</span>
                  <strong>
                    {(turn.report?.duration ?? 0).toFixed(2)}
                    <small>ms</small>
                  </strong>
                </div>
              </div>
              <div className="inspector-section">
                <h4>
                  {t.inspector.keyedStateTitle} <span>{t.inspector.keyedStateSub}</span>
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
                  <p className="muted-small">{t.inspector.noState}</p>
                )}
              </div>
              <div className="inspector-section">
                <h4>
                  {t.inspector.renderOpsTitle}{' '}
                  <span>{t.inspector.renderOpsCount(turn.operationCount)}</span>
                </h4>
                <p className="muted-small">{t.inspector.renderOpsDesc}</p>
                <CodeBlock
                  code={
                    turn.lastOperations.length
                      ? turn.lastOperations.map((op) => JSON.stringify(op)).join('\n')
                      : t.inspector.noUiChanges
                  }
                />
              </div>
              {!!turn.report?.diagnostics.length && (
                <div className="diagnostics">
                  <h4>{t.inspector.runtimeDiagnostics}</h4>
                  {turn.report.diagnostics.map((message, i) => (
                    <div className="diagnostic-warning" key={i}>
                      {message}
                    </div>
                  ))}
                </div>
              )}
              <div className="runtime-note">
                <Terminal size={15} />
                <p>{t.inspector.runtimeNote}</p>
              </div>
            </>
          )}
          {tab === 'data' && (
            <>
              <div className="inspector-section">
                <h4>
                  {t.inspector.appDataTitle} <span>{t.inspector.appDataSub}</span>
                </h4>
                <p className="muted-small">{t.inspector.appDataDesc}</p>
                <CodeBlock code={JSON.stringify(turn.appData, null, 2)} />
              </div>
              <details className="inspector-details">
                <summary>
                  {t.inspector.constantsTitle(
                    Object.keys(turn.compilation?.constants ?? {}).length,
                  )}
                </summary>
                <CodeBlock code={JSON.stringify(turn.compilation?.constants ?? {}, null, 2)} />
              </details>
            </>
          )}
          {tab === 'events' && (
            <>
              <div className="inspector-section">
                <h4>
                  {t.inspector.eventStreamTitle}{' '}
                  <span>{t.inspector.eventStreamChunks(turn.chunks)}</span>
                </h4>
                <p className="muted-small">{t.inspector.eventStreamDesc}</p>
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
        {t.inspector.sandboxedEval}
        <span>{t.inspector.noDynamicCode}</span>
      </div>
    </aside>
  );
}
