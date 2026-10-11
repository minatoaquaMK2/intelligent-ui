import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Maximize2,
  Pause,
  Play,
  X,
} from "lucide-react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { formatStep } from "./geometry";
import { defaultLabels } from "./labels";
import { validateScene } from "./scene";
import type { DiagramLabels, Scene } from "./types";

export interface DiagramExplorerProps {
  scene: Scene;
  /** Optional narrative chapter label. Independent of the diagram's module steps. */
  chapterNumber?: string;
  labels?: Partial<DiagramLabels>;
  className?: string;
  autoplayMs?: number;
  onSelect?: (nodeId: string) => void;
}

/** Change scene.id when the topology changes; language changes may keep the same id. */
export function DiagramExplorer(props: DiagramExplorerProps) {
  useMemo(() => validateScene(props.scene), [props.scene]);
  return <Explorer key={props.scene.id} {...props} />;
}

function Explorer({
  scene,
  chapterNumber,
  labels: overrides,
  className = "",
  autoplayMs = 2400,
  onSelect,
}: DiagramExplorerProps) {
  const labels = { ...defaultLabels, ...overrides };
  const [selected, setSelected] = useState(scene.nodes[0].id);
  const [flat, setFlat] = useState(false);
  const [spacing, setSpacing] = useState(50);
  const [reduced, setReduced] = useState(false);
  const [animated, setAnimated] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [focused, setFocused] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    scene.nodes.findIndex((node) => node.id === selected),
  );
  const node = scene.nodes[activeIndex];
  const nodeIds = scene.nodes.map((item) => item.id).join("\u001f");
  const heading = `${chapterNumber ? `${chapterNumber} / ` : ""}${scene.title}`;

  useEffect(() => {
    const viewport = canvas.current;
    const face = viewport?.querySelector(
      ".gx-diagram-node.gx-is-active .gx-node-face",
    );
    if (!viewport || !face) return;
    const keepSelectedVisible = () => {
      const box = viewport.getBoundingClientRect(),
        target = face.getBoundingClientRect();
      if (target.left < box.left + 12 || target.right > box.right - 12)
        viewport.scrollTo({
          left:
            viewport.scrollLeft +
            target.left -
            box.left -
            (box.width - target.width) / 2,
        });
    };
    keepSelectedVisible();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(keepSelectedVisible);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [node.id, focused, flat, spacing]);

  useEffect(() => {
    if (!autoplay || !animated || reduced) return;
    const timer = setInterval(
      () =>
        setSelected((current) => {
          const ids = nodeIds.split("\u001f");
          return ids[(ids.indexOf(current) + 1) % ids.length];
        }),
      Math.max(1200, autoplayMs),
    );
    return () => clearInterval(timer);
  }, [autoplay, animated, reduced, nodeIds, autoplayMs]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(preference.matches);
      if (preference.matches) {
        setAnimated(false);
        setAutoplay(false);
      }
    };
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFocused(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      ).filter((item) => item.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !panel.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keydown);
      if (focusButton.current?.isConnected) focusButton.current.focus();
      else if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [focused]);

  function select(id: string) {
    setAutoplay(false);
    setSelected(id);
    onSelect?.(id);
  }
  function move(offset: number) {
    select(
      scene.nodes[
        (activeIndex + offset + scene.nodes.length) % scene.nodes.length
      ].id,
    );
  }

  return (
    <section
      ref={panel}
      className={`gx-explorer ${focused ? "gx-is-focused" : ""} ${className}`}
      aria-label={heading}
      role={focused ? "dialog" : undefined}
      aria-modal={focused || undefined}
      tabIndex={-1}
    >
      <div className="gx-scene-toolbar">
        <h3>
          {chapterNumber && (
            <>
              {chapterNumber} <span>/</span>{" "}
            </>
          )}
          {scene.title}
          <small>SVG · INTERACTIVE</small>
        </h3>
        <div className="gx-diagram-controls">
          <div className="gx-segment" aria-label={labels.viewAngle}>
            <button
              type="button"
              aria-pressed={!flat}
              onClick={() => setFlat(false)}
            >
              {labels.view25D}
            </button>
            <button
              type="button"
              aria-pressed={flat}
              onClick={() => setFlat(true)}
            >
              {labels.viewFlat}
            </button>
          </div>
          <label className="gx-spacing">
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
            type="button"
            ref={focusButton}
            className="gx-focus-button"
            aria-pressed={focused}
            onClick={() => setFocused(!focused)}
          >
            {focused ? <X size={13} /> : <Maximize2 size={13} />}
            {focused ? labels.exitFocus : labels.focusView}
          </button>
        </div>
      </div>
      <div className="gx-scene-grid">
        <div className="gx-scene-visual">
          <div className="gx-diagram-legend">
            <span>
              <i />
              {labels.legendData}
            </span>
            <span>
              <i />
              {labels.legendEvent}
            </span>
          </div>
          <p className="gx-scene-summary">{scene.summary}</p>
          <div className="gx-scene-canvas" ref={canvas}>
            <ArchitectureDiagram
              scene={scene}
              heading={heading}
              selected={node.id}
              onSelect={select}
              flat={flat}
              animated={animated && !reduced}
              spacing={spacing}
              labels={labels}
            />
          </div>
          <p className="gx-scene-hint">{labels.note}</p>
        </div>
        <aside
          className="gx-scene-inspector"
          aria-live={autoplay ? "off" : "polite"}
        >
          <span className="gx-scene-kicker">
            {labels.step} {formatStep(activeIndex)}
            {node.eyebrow && ` / ${node.eyebrow}`}
          </span>
          <h4>{node.name}</h4>
          <span className="gx-scene-role">{node.role}</span>
          <p>{node.detail}</p>
          {!!node.facts?.length && (
            <ul>
              {node.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          )}
          {node.code && (
            <pre>
              <code>{node.code}</code>
            </pre>
          )}
          {node.source && (
            <a href={node.source.href} target="_blank" rel="noreferrer">
              {node.source.label}
              <ArrowUpRight size={12} />
            </a>
          )}
        </aside>
      </div>
      <div className="gx-scene-player">
        <div className="gx-scene-play-controls">
          <button
            type="button"
            aria-label={labels.previousStep}
            title={labels.previousStep}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            aria-label={autoplay ? labels.stopAutoplay : labels.autoplay}
            title={autoplay ? labels.stopAutoplay : labels.autoplay}
            aria-pressed={autoplay}
            disabled={!animated || reduced}
            onClick={() => setAutoplay(!autoplay)}
          >
            {autoplay ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            aria-label={labels.nextStep}
            title={labels.nextStep}
            onClick={() => move(1)}
          >
            <ArrowRight size={14} />
          </button>
          <span>
            {activeIndex + 1} / {scene.nodes.length}
            <i>·</i>
            {node.name}
          </span>
        </div>
        <div className="gx-scene-progress" aria-label={labels.moduleLabel}>
          {scene.nodes.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-label={labels.selectStep(item.name)}
              title={item.name}
              aria-pressed={item.id === node.id}
              onClick={() => select(item.id)}
            />
          ))}
        </div>
        <button
          type="button"
          className="gx-motion-toggle"
          aria-pressed={!animated || reduced}
          disabled={reduced}
          onClick={() => {
            setAnimated(!animated);
            setAutoplay(false);
          }}
        >
          {animated && !reduced ? <Pause size={12} /> : <Play size={12} />}
          {reduced
            ? labels.reducedMotion
            : animated
              ? labels.pauseMotion
              : labels.resumeMotion}
        </button>
      </div>
    </section>
  );
}
