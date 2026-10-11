import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Layers3,
  RotateCcw,
} from "lucide-react";
import {
  DiagramExplorer,
  type DiagramLabels,
  type Scene,
} from "../diagram-kit";
import "../diagram-kit/diagram.css";
import "./field-guide.css";

export interface Chapter {
  id: string;
  short: string;
  question: string;
  introduction: string;
  scene: Scene;
  experiment: {
    title: string;
    instruction: string;
    takeaway: string;
    scope?: string;
  };
  renderLab: () => ReactNode;
}
export interface PageCopy {
  home: string;
  explore: string;
  demo: string;
  source: string;
  chapter: string;
  tryIt: string;
  reset: string;
  previous: string;
  next: string;
  implementation: string;
  openDemo: string;
  loadDemo: string;
  fieldGuideEyebrow: string;
  learningLoop: string;
  exploreEyebrow: string;
  chaptersLabel: string;
  paginationLabel: string;
  demoEyebrow: string;
  implementationEyebrow: string;
}
const defaultCopy: PageCopy = {
  home: "Mechanism field guide",
  explore: "Start exploring",
  demo: "Try the full demo",
  source: "Source code",
  chapter: "CHAPTER",
  tryIt: "TRY IT YOURSELF",
  reset: "Reset experiment",
  previous: "Previous",
  next: "Next",
  implementation: "Inside the implementation",
  openDemo: "Open demo separately",
  loadDemo: "Load interactive demo",
  fieldGuideEyebrow: "AN INTERACTIVE FIELD GUIDE",
  learningLoop: "OBSERVE · INTERACT · UNDERSTAND",
  exploreEyebrow: "EXPLORE THE SYSTEM",
  chaptersLabel: "Chapters",
  paginationLabel: "Chapter pagination",
  demoEyebrow: "FROM MECHANISM TO APPLICATION",
  implementationEyebrow: "IMPLEMENTATION & EVIDENCE",
};

export function ExplainerPage({
  project,
  chapters,
  demo,
  implementation,
  copy = {},
  diagramLabels,
}: {
  project: {
    name: string;
    question: string;
    introduction: string;
    note: string;
    repoUrl?: string;
  };
  chapters: Chapter[];
  demo?: { title: string; description: string; url: string };
  implementation?: {
    description: string;
    links?: { label: string; href: string }[];
  };
  copy?: Partial<PageCopy>;
  diagramLabels?: Partial<DiagramLabels>;
}) {
  const words = { ...defaultCopy, ...copy };
  const readHash = () =>
    Math.max(
      0,
      chapters.findIndex((c) => `#${c.id}` === window.location.hash),
    );
  const [index, setIndex] = useState(readHash);
  const [revision, setRevision] = useState(0);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const chapter = chapters[index] ?? chapters[0];
  const number = String(index + 1).padStart(2, "0");

  useEffect(() => {
    const sync = () => setIndex(readHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [chapters]);
  useEffect(() => {
    const viewport = nav.current;
    const active = viewport?.querySelector<HTMLElement>(
      '[aria-current="step"]',
    );
    if (!viewport || !active) return;
    const reveal = () => {
      const box = viewport.getBoundingClientRect(),
        item = active.getBoundingClientRect();
      if (
        viewport.scrollWidth > viewport.clientWidth &&
        (item.left < box.left || item.right > box.right)
      )
        viewport.scrollLeft +=
          item.left - box.left - (box.width - item.width) / 2;
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [index]);

  function choose(next: number, scroll = false) {
    setIndex(next);
    setRevision(0);
    history.replaceState(null, "", `#${chapters[next].id}`);
    if (scroll)
      document.getElementById("explore")?.scrollIntoView({ block: "start" });
  }

  if (!chapter) return null;
  return (
    <div className="gx-site" id="top">
      <a className="gx-skip" href="#explore">
        {words.explore}
      </a>
      <header className="gx-header gx-container">
        <a className="gx-brand" href="#top">
          <Layers3 size={27} />
          <span>
            {project.name}
            <small>{words.home}</small>
          </span>
        </a>
        {project.repoUrl && (
          <a
            className="gx-button gx-source-link"
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer"
          >
            {words.source}
            <ArrowUpRight size={15} />
          </a>
        )}
      </header>
      <main>
        <section className="gx-hero gx-container">
          <div>
            <p className="gx-eyebrow">{words.fieldGuideEyebrow}</p>
            <h1>{project.question}</h1>
            <p className="gx-introduction">{project.introduction}</p>
            <div className="gx-hero-actions">
              <a className="gx-button gx-button-primary" href="#explore">
                {words.explore}
                <ArrowDown size={16} />
              </a>
              {demo && (
                <a className="gx-button" href="#demo">
                  {words.demo}
                  <ArrowUpRight size={15} />
                </a>
              )}
            </div>
          </div>
          <aside className="gx-hero-note">
            <span className="gx-eyebrow">{words.learningLoop}</span>
            <p>{project.note}</p>
            <ol>
              {chapters.map((c) => (
                <li key={c.id}>{c.short}</li>
              ))}
            </ol>
          </aside>
        </section>
        <section className="gx-workbench gx-container" id="explore">
          <aside className="gx-chapters">
            <p className="gx-eyebrow">{words.exploreEyebrow}</p>
            <nav ref={nav} aria-label={words.chaptersLabel}>
              {chapters.map((c, i) => (
                <button
                  type="button"
                  key={c.id}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => choose(i)}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  {c.short}
                  <ArrowRight size={13} />
                </button>
              ))}
            </nav>
          </aside>
          <article className="gx-chapter">
            <p className="gx-eyebrow">
              {words.chapter} {number} / {chapter.short}
            </p>
            <h2>{chapter.question}</h2>
            <p className="gx-chapter-intro">{chapter.introduction}</p>
            <DiagramExplorer
              key={chapter.id}
              scene={chapter.scene}
              chapterNumber={number}
              labels={diagramLabels}
            />
            <section className="gx-lab" aria-labelledby="gx-lab-title">
              <p className="gx-eyebrow">{words.tryIt}</p>
              <div className="gx-lab-heading">
                <div>
                  <h3 id="gx-lab-title">{chapter.experiment.title}</h3>
                  <p>{chapter.experiment.instruction}</p>
                </div>
                <button
                  type="button"
                  className="gx-reset"
                  aria-label={words.reset}
                  title={words.reset}
                  onClick={() => setRevision((n) => n + 1)}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="gx-lab-content" key={`${chapter.id}-${revision}`}>
                {chapter.renderLab()}
              </div>
              <p className="gx-takeaway">
                <ArrowDown size={16} />
                {chapter.experiment.takeaway}
              </p>
              {chapter.experiment.scope && (
                <p className="gx-scope">{chapter.experiment.scope}</p>
              )}
            </section>
            <nav className="gx-pagination" aria-label={words.paginationLabel}>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => choose(index - 1, true)}
              >
                <ArrowLeft size={15} />
                {words.previous}
              </button>
              <span>
                {number} / {String(chapters.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                disabled={index === chapters.length - 1}
                onClick={() => choose(index + 1, true)}
              >
                {words.next}
                <ArrowRight size={15} />
              </button>
            </nav>
          </article>
        </section>
        {demo && (
          <section className="gx-demo gx-container" id="demo">
            <p className="gx-eyebrow">{words.demoEyebrow}</p>
            <h2>{demo.title}</h2>
            <p>{demo.description}</p>
            <a
              className="gx-button"
              href={demo.url}
              target="_blank"
              rel="noreferrer"
            >
              {words.openDemo}
              <ArrowUpRight size={15} />
            </a>
            {demoLoaded ? (
              <iframe src={demo.url} title={demo.title} loading="lazy" />
            ) : (
              <button
                type="button"
                className="gx-load-demo"
                onClick={() => setDemoLoaded(true)}
              >
                {words.loadDemo}
                <ArrowRight size={20} />
              </button>
            )}
          </section>
        )}
        {implementation && (
          <section className="gx-about gx-container">
            <p className="gx-eyebrow">{words.implementationEyebrow}</p>
            <h2>{words.implementation}</h2>
            <p>{implementation.description}</p>
            {implementation.links?.map((link) => (
              <a
                className="gx-button"
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </section>
        )}
      </main>
      <footer className="gx-footer gx-container">
        <span>{project.name}</span>
        <a href="#top">↑ {words.home}</a>
      </footer>
    </div>
  );
}
