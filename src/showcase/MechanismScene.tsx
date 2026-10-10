import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, Pause, Play, X } from 'lucide-react';
import type { LessonTranslation } from '../i18n/types';
import { useI18n } from '../i18n';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { formatChapterNumber, type BoundaryRoute } from './architecture';
import { getScene } from './scenes';
import { sourceLink } from './lessons';

export function MechanismScene({
  lesson,
  chapterNumber,
}: {
  lesson: LessonTranslation;
  chapterNumber: string;
}) {
  const { lang, t } = useI18n();
  const labels = t.diagram;
  const [route, setRoute] = useState<BoundaryRoute>('native');
  const scene = getScene(lang, lesson.id, route);
  const [selected, setSelected] = useState(scene.nodes[0].id);
  const [flat, setFlat] = useState(false);
  const [spacing, setSpacing] = useState(50);
  const [animated, setAnimated] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [autoplay, setAutoplay] = useState(false);
  const [focused, setFocused] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  const index = Math.max(
    0,
    scene.nodes.findIndex((node) => node.id === selected),
  );
  const node = scene.nodes[index];

  useEffect(() => {
    if (!autoplay || !animated) return;
    const timer = setInterval(
      () =>
        setSelected((current) => {
          const active = scene.nodes.findIndex((item) => item.id === current);
          return scene.nodes[(active + 1) % scene.nodes.length].id;
        }),
      2400,
    );
    return () => clearInterval(timer);
  }, [autoplay, animated, scene.id]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (preference.matches) {
        setAnimated(false);
        setAutoplay(false);
      }
    };
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setFocused(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((item) => item.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keydown);
      focusButton.current?.focus();
    };
  }, [focused]);

  function select(id: string) {
    setAutoplay(false);
    setSelected(id);
  }
  function move(offset: number) {
    select(scene.nodes[(index + offset + scene.nodes.length) % scene.nodes.length].id);
  }
  function chooseRoute(next: BoundaryRoute) {
    setRoute(next);
    setAutoplay(false);
    setSelected(getScene(lang, lesson.id, next).nodes[0].id);
  }

  return (
    <section
      ref={panel}
      className={`s-diagram-panel s-scene-panel ${focused ? 'is-focused' : ''}`}
      aria-label={`${chapterNumber} / ${lesson.short}`}
      role={focused ? 'dialog' : undefined}
      aria-modal={focused || undefined}
      tabIndex={-1}
    >
      <div className="s-scene-toolbar">
        <h3>
          {chapterNumber} <span>/</span> {lesson.short} <small>SVG · INTERACTIVE</small>
        </h3>
        <div className="s-diagram-controls">
          <div className="s-segment" aria-label={labels.viewAngle}>
            <button aria-pressed={!flat} onClick={() => setFlat(false)}>
              {labels.view25D}
            </button>
            <button aria-pressed={flat} onClick={() => setFlat(true)}>
              {labels.viewFlat}
            </button>
          </div>
          <label className="s-spacing">
            {labels.spacing}
            <input
              type="range"
              min="0"
              max="100"
              value={spacing}
              onChange={(event) => setSpacing(Number(event.target.value))}
            />
          </label>
          <button
            ref={focusButton}
            className="s-focus-button"
            aria-pressed={focused}
            onClick={() => setFocused(!focused)}
          >
            {focused ? <X size={13} /> : <Maximize2 size={13} />}
            {focused ? labels.exitFocus : labels.focusView}
          </button>
        </div>
      </div>
      {lesson.id === 'boundary' && (
        <div className="s-route-controls">
          <div className="s-segment" aria-label={labels.routeLabel}>
            <button aria-pressed={route === 'native'} onClick={() => chooseRoute('native')}>
              {labels.nativeRoute}
            </button>
            <button aria-pressed={route === 'web'} onClick={() => chooseRoute('web')}>
              {labels.webRoute}
            </button>
          </div>
        </div>
      )}
      <div className="s-scene-grid">
        <div className="s-scene-visual">
          <div className="s-diagram-legend">
            <span>
              <i />
              {labels.legendData}
            </span>
            <span>
              <i />
              {labels.legendEvent}
            </span>
          </div>
          <p className="s-scene-summary">
            {route === 'web' ? labels.webRouteNote : labels.pathDescriptions[lesson.id]}
          </p>
          <div className="s-scene-canvas">
            <ArchitectureDiagram
              scene={scene}
              heading={`${chapterNumber} / ${lesson.short}`}
              selected={node.id}
              onSelect={select}
              flat={flat}
              animated={animated}
              spacing={spacing}
              labels={labels}
            />
          </div>
          <p className="s-scene-hint">{labels.note}</p>
        </div>
        <aside className="s-scene-inspector" aria-live={autoplay ? 'off' : 'polite'}>
          <span className="s-scene-kicker">
            {labels.step} {formatChapterNumber(index)} / {node.english}
          </span>
          <h4>{node.name}</h4>
          <span className="s-scene-role">{node.role}</span>
          <p>{node.detail}</p>
          <ul>
            {node.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <pre>
            <code>{node.code}</code>
          </pre>
          <a href={sourceLink(node.file)} target="_blank" rel="noreferrer">
            {node.file}
            <ArrowUpRight size={12} />
          </a>
        </aside>
      </div>
      <div className="s-scene-player">
        <div className="s-scene-play-controls">
          <button
            aria-label={labels.previousStep}
            title={labels.previousStep}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            aria-label={autoplay ? labels.stopAutoplay : labels.autoplay}
            title={autoplay ? labels.stopAutoplay : labels.autoplay}
            aria-pressed={autoplay}
            disabled={!animated}
            onClick={() => setAutoplay(!autoplay)}
          >
            {autoplay ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button aria-label={labels.nextStep} title={labels.nextStep} onClick={() => move(1)}>
            <ArrowRight size={14} />
          </button>
          <span>
            {index + 1} / {scene.nodes.length} <i>·</i> {node.name}
          </span>
        </div>
        <div className="s-scene-progress" aria-label={labels.moduleLabel}>
          {scene.nodes.map((item) => (
            <button
              key={item.id}
              aria-label={labels.selectStep(item.name)}
              title={item.name}
              aria-pressed={item.id === node.id}
              onClick={() => select(item.id)}
            />
          ))}
        </div>
        <button
          className="s-motion-toggle"
          aria-pressed={!animated}
          onClick={() => {
            setAnimated(!animated);
            setAutoplay(false);
          }}
        >
          {animated ? <Pause size={12} /> : <Play size={12} />}
          {animated ? labels.pauseMotion : labels.resumeMotion}
        </button>
      </div>
    </section>
  );
}
