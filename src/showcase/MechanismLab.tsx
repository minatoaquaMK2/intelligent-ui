import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, Code2, Copy, Play, RotateCcw, Square } from 'lucide-react';
import { compile } from '../core/compiler';
import { LiveInterface } from '../components/LiveInterface';
import type { Compilation, RuntimeResult } from '../core/types';
import {
  fixtureA,
  fixtureB,
  labSource,
  lessons,
  streamBase,
  streamSources,
  type LessonId,
} from './lessons';

export function MechanismLab({ lesson }: { lesson: LessonId }) {
  const info = lessons.find((item) => item.id === lesson)!;
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
        : streamSources[variant]
      : lesson === 'boundary'
        ? [
            labSource,
            labSource + '\n<unknownWidget label="未知组件" />',
            labSource + '\n<text>{window.location.href}</text>',
          ][variant]
        : labSource + (revision ? `\n<caption>已重新编译 ${revision} 次</caption>` : '');
  const compilation = useMemo(() => compile(source), [source]);
  const appData = lesson === 'data' && variant === 1 ? fixtureB : fixtureA;
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
    setPartial(streamBase);
    setStreaming(true);
    let position = streamBase.length;
    timer.current = setInterval(() => {
      position += 5;
      setPartial(streamSources[2].slice(0, position));
      if (position >= streamSources[2].length) stop();
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
        <span className="s-status-dot" /> TRY IT YOURSELF <span>真实编译器 · 真实 Worker</span>
      </div>
      <div className="s-lab-heading">
        <div>
          <h3 id="experiment-title">{info.experiment}</h3>
          <p>{info.instruction}</p>
        </div>
        <button
          className="s-icon-button"
          aria-label="重置当前实验"
          title="重置当前实验"
          onClick={() => {
            clearInterval(timer.current);
            setStreaming(false);
            setVariant(0);
            setRevision(0);
            setInstance((n) => n + 1);
            setInteractions(0);
            setMessage('');
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="s-experiment-controls">
        {lesson === 'state' && (
          <button className="s-control" onClick={() => setRevision((n) => n + 1)}>
            <Code2 size={15} />
            重新编译 · 保留状态
          </button>
        )}
        {lesson === 'streaming' && (
          <>
            <div className="s-segment" aria-label="源码阶段">
              {['文字增长', '未完成标签', '完整组件'].map((name, i) => (
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
              {streaming ? '结束播放' : '播放流式编译'}
            </button>
          </>
        )}
        {lesson === 'data' && (
          <div className="s-segment" aria-label="模拟数据">
            {['快照 A · 68 / 79 / 86°C', '快照 B · 83 / 88 / 92°C'].map((name, i) => (
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
          <div className="s-segment" aria-label="校验案例">
            {['合法表达式', '未知组件', '访问 window'].map((name, i) => (
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
          {lesson === 'streaming' ? `本次更新：${update}` : '预置源码 · 无模型请求'}
        </span>
      </div>
      <div className="s-experiment-grid">
        <div className="s-code-panel">
          <div className="s-code-tabs" role="tablist" aria-label="查看中间产物">
            {[
              ['source', 'DSL 源码'],
              ['compiled', '编译产物'],
              ['data', 'appData'],
              ['runtime', '状态 / 操作'],
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
              aria-label="复制当前内容"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                } catch {
                  setMessage('浏览器未允许复制；可在代码区选择并复制文本。');
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
                <Check size={13} /> 编译通过 · {compilation.program.roots.length} 个根节点
              </span>
            )}
          </div>
        </div>
        <div className="s-render-panel">
          <div className="s-render-header">
            <span>
              <span className="s-status-dot" /> LIVE OUTPUT
            </span>
            <span>Worker → React</span>
          </div>
          <div className="s-live-output">
            <LiveInterface
              key={instance}
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
              本地事件 <b>{interactions}</b>
            </span>
            <span>
              模型请求 <b>0</b>
            </span>
            <span>
              threshold <b>{String(report?.state.threshold ?? '—')}</b>
            </span>
          </div>
        </div>
      </div>
      <div className="s-experiment-note">
        <ArrowDown size={16} />
        <p>{info.takeaway}</p>
        <span>OBSERVE → INTERACT → UNDERSTAND</span>
      </div>
      {(lesson === 'action' || message) && (
        <div className="s-action-output" aria-live="polite">
          <span>
            ISSUE NEW TURN <ArrowUpRight size={13} />
          </span>
          <p>{message || '还没有动作。调整右侧阈值，再点击「带着当前状态继续」。'}</p>
          <small>
            本实验只展示 action 内容。完整 POC
            中，宿主用这段文本创建新回复，并附带经过白名单校验的界面 context 快照。
          </small>
        </div>
      )}
      {lesson === 'state' && (
        <p className="s-footnote">
          「重新编译」复用当前 Worker；「重置实验」创建新
          Worker。跨编译保留状态，与跨刷新持久化是两种能力。
        </p>
      )}
      {lesson === 'boundary' && (
        <p className="s-footnote">
          当前 POC 没有跨域 iframe 沙箱或任意网页执行能力；这里展示的是组件白名单和 AST
          校验，不构成完整生产安全方案。
        </p>
      )}
      {lesson === 'streaming' && (
        <p className="s-footnote">
          这里按预设间隔切分源码，演示真实解析行为；不是模型输出速度测试。最后可用的组件随着有效结构保留。
        </p>
      )}
    </section>
  );
}
