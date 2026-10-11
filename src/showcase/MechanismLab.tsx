import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Code2, Copy, Play, RotateCcw, Square } from 'lucide-react';
import { compile } from '../core/compiler';
import { LiveInterface } from '../components/LiveInterface';
import type { Compilation, RuntimeResult } from '../core/types';
import { useI18n } from '../i18n';
import { getLessons, type LessonId } from './lessons';
import {
  classifyCompilation,
  getBoundarySource,
  getExperiment,
  type EvidenceScenario,
} from './experiments';

export function MechanismLab({ lesson }: { lesson: LessonId }) {
  const { lang, t } = useI18n();
  const lessons = getLessons(lang);
  const info = lessons.find((item) => item.id === lesson) ?? lessons[0];
  const [scenario, setScenario] = useState<EvidenceScenario>('rack');
  const experiment = useMemo(() => getExperiment(lang, lesson, scenario), [lang, lesson, scenario]);

  const [tab, setTab] = useState('source');
  const [variant, setVariant] = useState(0);
  const [revision, setRevision] = useState(0);
  const [instance, setInstance] = useState(0);
  const [report, setReport] = useState<RuntimeResult>();
  const [interactions, setInteractions] = useState(0);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState<string>();
  const [actionContext, setActionContext] = useState<RuntimeResult['context']>();
  const [evidence, setEvidence] = useState<
    Partial<Record<EvidenceScenario, { worker: boolean; interaction: boolean }>>
  >({});
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const source =
    lesson === 'streaming'
      ? (partial ?? experiment.stream!.phases[variant])
      : lesson === 'boundary'
        ? getBoundarySource(experiment.source, variant)
        : experiment.source +
          (revision ? `\n<caption>${t.lab.recompileCount(revision)}</caption>` : '');
  const compilation = useMemo(() => compile(source), [source]);
  const appData =
    experiment.snapshots[(lesson === 'data' || lesson === 'evidence') && variant === 1 ? 1 : 0];
  const previous = useRef<Compilation | undefined>(undefined);
  const update = useMemo(() => {
    const field = classifyCompilation(previous.current, compilation);
    previous.current = compilation;
    return field;
  }, [compilation]);

  function stop() {
    clearInterval(timer.current);
    setStreaming(false);
  }

  function play() {
    clearInterval(timer.current);
    const stream = experiment.stream!;
    const full = stream.phases[stream.phases.length - 1];
    let position = partial && partial.length < full.length ? partial.length : stream.base.length;
    setPartial(full.slice(0, position));
    setStreaming(true);
    timer.current = setInterval(() => {
      position = Math.min(position + 7, full.length);
      setPartial(full.slice(0, position));
      if (position >= full.length) {
        stop();
        setVariant(stream.phases.length - 1);
      }
    }, 100);
  }

  function resetRuntime() {
    stop();
    setPartial(undefined);
    setVariant(0);
    setRevision(0);
    setInstance((n) => n + 1);
    setReport(undefined);
    setInteractions(0);
    setMessage('');
    setActionContext(undefined);
  }

  const content =
    tab === 'source'
      ? source
      : tab === 'compiled'
        ? JSON.stringify(
            {
              program: compilation.program,
              constants: compilation.constants,
              diagnostics: compilation.diagnostics,
            },
            null,
            2,
          )
        : tab === 'fallback'
          ? compilation.fallbackMarkdown || t.lab.noFallback
          : tab === 'data'
            ? JSON.stringify(appData, null, 2)
            : JSON.stringify(
                {
                  state: report?.state ?? {},
                  operations: report?.operations ?? [],
                  diagnostics: report?.diagnostics ?? [],
                  context: report?.context ?? {},
                },
                null,
                2,
              );

  return (
    <section className="s-lab" aria-labelledby="experiment-title">
      <div className="s-section-label">
        <span className="s-status-dot" /> {t.lab.tryItYourself} <span>{t.lab.badgeSubtitle}</span>
      </div>
      <div className="s-lab-heading">
        <div>
          <h3 id="experiment-title">{info.experiment}</h3>
          <p>{info.instruction}</p>
        </div>
        <button
          className="s-icon-button"
          aria-label={t.lab.resetLab}
          title={t.lab.resetLab}
          onClick={() => {
            resetRuntime();
            setEvidence({});
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="s-experiment-controls">
        {lesson === 'evidence' && (
          <div className="s-segment s-lab-scenario" aria-label={t.lab.businessScenario}>
            {(['rack', 'gpu', 'network'] as const).map((id) => (
              <button
                key={id}
                aria-pressed={scenario === id}
                onClick={() => {
                  if (scenario === id) return;
                  resetRuntime();
                  setScenario(id);
                }}
              >
                {t.lab.scenarios[id]}
              </button>
            ))}
          </div>
        )}
        {(lesson === 'state' || lesson === 'evidence') && (
          <button className="s-control" onClick={() => setRevision((n) => n + 1)}>
            <Code2 size={15} />
            {t.lab.recompileKeepState}
          </button>
        )}
        {lesson === 'streaming' && (
          <>
            <div className="s-segment" aria-label={t.lab.phaseSource}>
              {[
                t.lab.textStart,
                t.lab.textGrowing,
                t.lab.incompleteTag,
                t.lab.completeComponent,
              ].map((name, i) => (
                <button
                  key={name}
                  aria-pressed={variant === i && partial === undefined}
                  onClick={() => {
                    clearInterval(timer.current);
                    setStreaming(false);
                    setPartial(undefined);
                    setVariant(i);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button className="s-control" onClick={streaming ? stop : play}>
              {streaming ? <Square size={13} /> : <Play size={13} />}
              {streaming
                ? t.lab.stopStream
                : partial && partial.length < experiment.source.length
                  ? t.lab.resumeStream
                  : t.lab.playStream}
            </button>
          </>
        )}
        {(lesson === 'data' || (lesson === 'evidence' && scenario === 'network')) && (
          <div className="s-segment" aria-label={t.lab.simData}>
            {[t.lab.snapshotA, t.lab.snapshotB].map((name, i) => (
              <button
                key={name}
                aria-pressed={variant === i}
                onClick={() => {
                  setVariant(i);
                  setTab('data');
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {lesson === 'boundary' && (
          <div className="s-segment" aria-label={t.lab.validationCases}>
            {[t.lab.validExpr, t.lab.unknownWidget, t.lab.accessWindow].map((name, i) => (
              <button
                key={name}
                aria-pressed={variant === i}
                onClick={() => {
                  setVariant(i);
                  setTab('source');
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <span className="s-lab-mode">
          {lesson === 'streaming' ? t.lab.latestUpdate(update) : t.lab.presetSourceMode}
        </span>
      </div>
      <div className="s-lab-trace" aria-label={t.lab.observation}>
        <span>
          <small>{t.lab.traceSource}</small>
          <b>
            {source.length} {t.lab.characters}
          </b>
        </span>
        <span>
          <small>{t.lab.traceCompiler}</small>
          <b>
            {compilation.program.roots.length} {t.lab.roots} · {compilation.diagnostics.length}{' '}
            {t.lab.diagnostics}
          </b>
        </span>
        <span>
          <small>{t.lab.traceWorker}</small>
          <b>
            {report
              ? `${report.operations.length} ops · ${report.duration.toFixed(1)} ms`
              : t.lab.evidencePending}
          </b>
        </span>
        <span>
          <small>{lesson === 'data' ? t.lab.programStatus : t.lab.patchField}</small>
          <b>{lesson === 'data' ? t.lab.programUnchanged : update}</b>
        </span>
      </div>
      <div className="s-experiment-grid">
        <div className="s-code-panel">
          <div className="s-code-tabs">
            <div className="s-artifact-tab-list" role="tablist" aria-label={t.lab.artifacts}>
              {[
                ['source', t.lab.tabs.source],
                ['compiled', t.lab.tabs.compiled],
                ['data', t.lab.tabs.data],
                ['runtime', t.lab.tabs.runtime],
                ...(lesson === 'streaming' ? [['fallback', t.lab.tabs.fallback]] : []),
              ].map(([id, title], index, tabs) => (
                <button
                  id={`artifact-tab-${id}`}
                  role="tab"
                  aria-controls="artifact-content"
                  aria-selected={tab === id}
                  tabIndex={tab === id ? 0 : -1}
                  onKeyDown={(event) => {
                    const next =
                      event.key === 'ArrowRight'
                        ? (index + 1) % tabs.length
                        : event.key === 'ArrowLeft'
                          ? (index - 1 + tabs.length) % tabs.length
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? tabs.length - 1
                              : -1;
                    if (next < 0) return;
                    event.preventDefault();
                    setTab(tabs[next][0]);
                    event.currentTarget.parentElement
                      ?.querySelector<HTMLButtonElement>(`#artifact-tab-${tabs[next][0]}`)
                      ?.focus();
                  }}
                  key={id}
                  onClick={() => setTab(id)}
                >
                  {title}
                </button>
              ))}
            </div>
            <button
              className="s-copy"
              aria-label={t.lab.copyTooltip}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {
                  setMessage(t.lab.copyError);
                }
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <pre
            id="artifact-content"
            role="tabpanel"
            aria-labelledby={`artifact-tab-${tab}`}
            tabIndex={0}
          >
            <code>{content}</code>
          </pre>
          <div
            className={`s-diagnostic ${compilation.diagnostics.length ? 'has-diagnostic' : ''}`}
            aria-live="polite"
          >
            {compilation.diagnostics.length ? (
              compilation.diagnostics.map((item, i) => (
                <span key={i}>
                  <b>{item.code}</b> {item.message}
                </span>
              ))
            ) : (
              <span>
                <Check size={13} /> {t.lab.compiledSuccess(compilation.program.roots.length)}
              </span>
            )}
          </div>
        </div>
        <div className="s-render-panel">
          <div className="s-render-header">
            <span>
              <span className="s-status-dot" /> {t.lab.liveOutput}
            </span>
            <span>{t.lab.workerToReact}</span>
          </div>
          <div className="s-live-output">
            <LiveInterface
              key={`${instance}-${lang}-${scenario}`}
              compilation={compilation}
              appData={appData}
              disabled={false}
              onResult={(result, interaction) => {
                setReport(result);
                if (interaction) setInteractions((n) => n + 1);
                if (result.action) setActionContext(result.context);
                if (lesson === 'evidence')
                  setEvidence((current) => ({
                    ...current,
                    [scenario]: {
                      worker: result.diagnostics.length === 0,
                      interaction: (current[scenario]?.interaction ?? false) || interaction,
                    },
                  }));
              }}
              onAction={(action) => setMessage(action.text)}
            />
          </div>
          <div className="s-runtime-stats">
            <span>
              {t.lab.localEvents} <b>{interactions}</b>
            </span>
            <span>
              {t.lab.modelRequests} <b>0</b>
            </span>
            <span>
              {experiment.contextKey ?? experiment.stateKey}{' '}
              <b>
                {String(
                  (experiment.contextKey
                    ? report?.context?.[experiment.contextKey]
                    : report?.state[experiment.stateKey]) ?? '—',
                )}
              </b>
            </span>
          </div>
        </div>
      </div>
      {lesson === 'evidence' && (
        <div className="s-evidence-record" aria-live="polite">
          <h4>{t.lab.evidenceTitle}</h4>
          <ul>
            {(['rack', 'gpu', 'network'] as const).map((id) => (
              <li
                key={id}
                className={evidence[id]?.worker && evidence[id]?.interaction ? 'is-verified' : ''}
              >
                {evidence[id]?.worker && evidence[id]?.interaction ? (
                  <Check size={14} />
                ) : (
                  <Square size={12} />
                )}
                <strong>{t.lab.scenarios[id]}</strong>
                <span>{evidence[id]?.worker ? t.lab.evidenceWorker : t.lab.evidencePending}</span>
                <span>
                  {evidence[id]?.interaction
                    ? t.lab.evidenceInteraction
                    : t.lab.evidenceNeedsInteraction}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="s-experiment-note">
        <ArrowDown size={16} />
        <p>{info.takeaway}</p>
        <span>OBSERVE → INTERACT → UNDERSTAND</span>
      </div>
      {(lesson === 'action' || message) && (
        <div className="s-action-output" aria-live="polite">
          <span>
            {t.lab.issueNewTurn} <ArrowUpRight size={13} />
          </span>
          <p>{message || t.lab.noActionDefault}</p>
          {actionContext && (
            <pre>
              <code>{JSON.stringify(actionContext, null, 2)}</code>
            </pre>
          )}
          <small>{t.lab.actionNote}</small>
        </div>
      )}
      {lesson === 'state' && <p className="s-footnote">{t.lab.footnoteState}</p>}
      {lesson === 'boundary' && <p className="s-footnote">{t.lab.footnoteBoundary}</p>}
      {lesson === 'streaming' && <p className="s-footnote">{t.lab.footnoteStreaming}</p>}
      {lesson === 'evidence' && <p className="s-footnote">{t.lab.footnoteEvidence}</p>}
    </section>
  );
}
