import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Code2, Copy, Play, RotateCcw, Square } from 'lucide-react';
import { compile } from '../core/compiler';
import { LiveInterface } from '../components/LiveInterface';
import type { Compilation, RuntimeResult } from '../core/types';
import { useI18n } from '../i18n';
import {
  fixtureA,
  fixtureB,
  getLabSource,
  getLessons,
  getStreamBase,
  getStreamSources,
  type LessonId,
} from './lessons';

export function MechanismLab({ lesson }: { lesson: LessonId }) {
  const { lang, t } = useI18n();
  const lessons = getLessons(lang);
  const info = lessons.find((item) => item.id === lesson) ?? lessons[0];
  const currentLabSource = getLabSource(lang);
  const currentStreamSources = getStreamSources(lang);
  const currentStreamBase = getStreamBase(lang);

  const [tab, setTab] = useState('source');
  const [variant, setVariant] = useState(0);
  const [revision, setRevision] = useState(0);
  const [instance, setInstance] = useState(0);
  const [report, setReport] = useState<RuntimeResult>();
  const [interactions, setInteractions] = useState(0);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const source =
    lesson === 'streaming'
      ? streaming
        ? partial
        : currentStreamSources[variant]
      : lesson === 'boundary'
        ? [
            currentLabSource,
            currentLabSource +
              `\n<unknownWidget label="${lang === 'en' ? 'Unknown Widget' : '未知组件'}" />`,
            currentLabSource + '\n<text>{window.location.href}</text>',
          ][variant]
        : currentLabSource +
          (revision ? `\n<caption>${t.lab.recompileCount(revision)}</caption>` : '');

  const compilation = useMemo(() => compile(source), [source]);
  const appData =
    (lesson === 'data' || lesson === 'evidence') && variant === 1 ? fixtureB : fixtureA;
  const previous = useRef<Compilation | undefined>(undefined);
  const update = useMemo(() => {
    const old = previous.current;
    previous.current = compilation;
    return JSON.stringify(old?.program) !== JSON.stringify(compilation.program)
      ? 'program'
      : JSON.stringify(old?.constants) !== JSON.stringify(compilation.constants)
        ? 'constants'
        : 'source';
  }, [compilation]);

  function stop() {
    clearInterval(timer.current);
    setStreaming(false);
    setVariant(2);
  }

  function play() {
    clearInterval(timer.current);
    setPartial(currentStreamBase);
    setStreaming(true);
    let position = currentStreamBase.length;
    timer.current = setInterval(() => {
      position += 5;
      setPartial(currentStreamSources[2].slice(0, position));
      if (position >= currentStreamSources[2].length) stop();
    }, 70);
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
        : tab === 'data'
          ? JSON.stringify(appData, null, 2)
          : JSON.stringify(
              {
                state: report?.state ?? {},
                operations: report?.operations ?? [],
                diagnostics: report?.diagnostics ?? [],
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
            clearInterval(timer.current);
            setStreaming(false);
            setVariant(0);
            setRevision(0);
            setInstance((n) => n + 1);
            setReport(undefined);
            setInteractions(0);
            setMessage('');
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="s-experiment-controls">
        {(lesson === 'state' || lesson === 'evidence') && (
          <button className="s-control" onClick={() => setRevision((n) => n + 1)}>
            <Code2 size={15} />
            {t.lab.recompileKeepState}
          </button>
        )}
        {lesson === 'streaming' && (
          <>
            <div className="s-segment" aria-label={t.lab.phaseSource}>
              {[t.lab.textGrowing, t.lab.incompleteTag, t.lab.completeComponent].map((name, i) => (
                <button
                  key={name}
                  aria-pressed={variant === i && !streaming}
                  onClick={() => {
                    clearInterval(timer.current);
                    setStreaming(false);
                    setVariant(i);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
            <button className="s-control" onClick={streaming ? stop : play}>
              {streaming ? <Square size={13} /> : <Play size={13} />}
              {streaming ? t.lab.stopStream : t.lab.playStream}
            </button>
          </>
        )}
        {(lesson === 'data' || lesson === 'evidence') && (
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
      <div className="s-experiment-grid">
        <div className="s-code-panel">
          <div className="s-code-tabs" role="tablist" aria-label="查看中间产物">
            {[
              ['source', t.lab.tabs.source],
              ['compiled', t.lab.tabs.compiled],
              ['data', t.lab.tabs.data],
              ['runtime', t.lab.tabs.runtime],
            ].map(([id, title]) => (
              <button
                id={`artifact-tab-${id}`}
                role="tab"
                aria-controls="artifact-content"
                aria-selected={tab === id}
                key={id}
                onClick={() => setTab(id)}
              >
                {title}
              </button>
            ))}
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
              key={`${instance}-${lang}`}
              compilation={compilation}
              appData={appData}
              disabled={false}
              onResult={(result, interaction) => {
                setReport(result);
                if (interaction) setInteractions((n) => n + 1);
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
              {t.lab.threshold} <b>{String(report?.state.threshold ?? '—')}</b>
            </span>
          </div>
        </div>
      </div>
      {lesson === 'evidence' && (
        <div className="s-evidence-record" aria-live="polite">
          <h4>{t.lab.evidenceTitle}</h4>
          <ul>
            {[
              [compilation.diagnostics.length === 0, t.lab.evidenceCompiled],
              [!!report, t.lab.evidenceWorker],
              [interactions > 0, t.lab.evidenceInteraction],
            ].map(([verified, label]) => (
              <li key={String(label)} className={verified ? 'is-verified' : ''}>
                {verified ? <Check size={14} /> : <Square size={12} />}
                {label}
                {!verified && ` · ${t.lab.evidencePending}`}
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
