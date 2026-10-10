import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Github,
  Globe,
  Layers3,
  Maximize2,
  Menu,
  X,
} from 'lucide-react';
import { MechanismLab } from './MechanismLab';
import { COMPONENT_COUNT, getLessons, getStages, REPO, sourceLink } from './lessons';
import { I18nProvider, useI18n } from '../i18n';
import '../styles.css';

function Brand() {
  const { t } = useI18n();
  return (
    <a className="s-brand" href="#top" aria-label={t.brand.ariaHome}>
      <span className="s-brand-symbol" aria-hidden="true">
        <Layers3 size={24} strokeWidth={1.7} />
      </span>
      <span>
        {t.brand.title}
        <span className="s-brand-light">ui</span>
        <small>{t.brand.sub}</small>
      </span>
    </a>
  );
}

function ArchitectureDiagram({
  selected,
  onSelect,
  flat,
  stages,
}: {
  selected: number;
  onSelect: (n: number) => void;
  flat: boolean;
  stages: ReturnType<typeof getStages>;
}) {
  const { t } = useI18n();
  const positions = [
    [32, 73],
    [268, 73],
    [504, 73],
    [740, 73],
    [280, 253],
  ];
  return (
    <svg
      className="s-architecture-svg"
      viewBox="0 0 976 366"
      role="group"
      aria-label={t.diagram.ariaLabel}
    >
      <defs>
        <pattern id="diagram-dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="#c9d2c8" />
        </pattern>
        <marker
          id="arrow-forward"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M1 1 9 5 1 9" fill="none" stroke="#789087" strokeWidth="1.7" />
        </marker>
        <marker
          id="arrow-back"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M1 1 9 5 1 9" fill="none" stroke="#b7805e" strokeWidth="1.7" />
        </marker>
      </defs>
      <rect width="976" height="366" fill="url(#diagram-dots)" />
      <g fill="none" stroke="#789087" strokeWidth="1.6" markerEnd="url(#arrow-forward)">
        {[0, 1, 2].map((n) => (
          <path
            key={n}
            d={`M ${positions[n][0] + (flat ? 180 : 204)} 126 H ${positions[n + 1][0] - 9}`}
          />
        ))}
        <path d="M 485 292 H 589 V 201" strokeDasharray="5 5" />
      </g>
      <path
        d="M 828 196 V 224 H 595 V 196"
        fill="none"
        stroke="#b7805e"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        markerEnd="url(#arrow-back)"
      />
      <g className="s-svg-micro" fill="#6d7d74">
        <text x="248" y="107" textAnchor="middle">
          {t.diagram.dsl}
        </text>
        <text x="484" y="107" textAnchor="middle">
          {t.diagram.ir}
        </text>
        <text x="720" y="107" textAnchor="middle" fontSize="7">
          {t.diagram.uiOps}
        </text>
        <text x="603" y="291">
          {t.diagram.dataFeed}
        </text>
        <text x="709" y="244" textAnchor="middle" fill="#a37658">
          {t.diagram.handlerId}
        </text>
      </g>
      {stages.map((stage, n) => {
        const [x, y] = positions[n];
        const height = n === 4 ? 68 : 115;
        const active = n === selected;
        return (
          <g
            key={stage.name}
            className={`s-diagram-node ${active ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${stage.name}：${stage.role}`}
            aria-pressed={active}
            onClick={() => onSelect(n)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(n);
              }
            }}
          >
            {!flat && (
              <>
                <path d={`M${x} ${y}l26 -20h180l-26 20Z`} fill={stage.color} stroke="#a8b8ad" />
                <path
                  d={`M${x + 180} ${y}l26 -20v${height}l-26 20Z`}
                  fill={active ? '#85ac99' : '#c7d2c7'}
                  stroke="#a8b8ad"
                />
              </>
            )}
            <rect
              className="s-node-face"
              x={x}
              y={y}
              width="180"
              height={height}
              fill={active ? '#294f45' : '#f9faf6'}
              stroke={active ? '#294f45' : '#9dab9e'}
              strokeWidth={active ? '2' : '1.2'}
            />
            <text
              x={x + 17}
              y={y + 29}
              fill={active ? '#f2f5e9' : '#2d4b41'}
              fontSize="16"
              fontWeight="600"
            >
              {stage.name}
            </text>
            <circle cx={x + 160} cy={y + 25} r="3.1" fill={active ? '#d2ef93' : '#a6b9ac'} />
            <text
              className="s-svg-micro"
              x={x + 17}
              y={y + 49}
              fill={active ? '#c1d6c7' : '#78877b'}
            >
              {stage.english}
            </text>
            {n !== 4 && (
              <>
                <line
                  x1={x + 17}
                  y1={y + 67}
                  x2={x + 163}
                  y2={y + 67}
                  stroke={active ? '#547368' : '#dbe2d9'}
                />
                <text x={x + 17} y={y + 91} fill={active ? '#e2eade' : '#647368'} fontSize="11">
                  {stage.role}
                </text>
              </>
            )}
            <text className="s-svg-micro" x={x} y={y - (flat ? 12 : 32)} fill="#557367">
              0{n + 1} / {n === 4 ? t.diagram.dataLane : t.diagram.execLayer}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ShowcaseContent() {
  const { t, lang, toggleLang } = useI18n();
  const lessons = getLessons(lang);
  const stages = getStages(lang);

  const [chapter, setChapter] = useState(() =>
    Math.max(
      0,
      lessons.findIndex((item) => `#${item.id}` === window.location.hash),
    ),
  );
  const [selected, setSelected] = useState(lessons[chapter]?.node ?? 0);
  const [flat, setFlat] = useState(false);
  const [menu, setMenu] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  const lesson = lessons[chapter] ?? lessons[0];
  const stage = stages[selected] ?? stages[0];
  const demoUrl = `${import.meta.env.BASE_URL}demo/`;

  function choose(index: number, scroll = false) {
    setChapter(index);
    setSelected(lessons[index].node);
    history.replaceState(null, '', `#${lessons[index].id}`);
    if (scroll)
      document.getElementById('learn')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    const sync = () => {
      const index = lessons.findIndex((item) => `#${item.id}` === location.hash);
      if (index >= 0) {
        setChapter(index);
        setSelected(lessons[index].node);
      }
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [lessons]);

  return (
    <div className="s-site" id="top">
      <a className="s-skip" href="#learn">
        {t.nav.skip}
      </a>
      <header className="s-header s-container">
        <Brand />
        <button
          className="s-mobile-toggle"
          aria-label={menu ? t.nav.menuClose : t.nav.menuOpen}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={menu ? 'is-open' : ''} aria-label="页面导航">
          <a href="#learn" onClick={() => setMenu(false)}>
            {t.nav.mechanisms}
          </a>
          <a href="#demo" onClick={() => setMenu(false)}>
            {t.nav.demo}
          </a>
          <a href="#about" onClick={() => setMenu(false)}>
            {t.nav.about}
          </a>
          <button
            className="s-mobile-lang"
            onClick={() => {
              toggleLang();
              setMenu(false);
            }}
          >
            <Globe size={15} />
            <span>{t.nav.switchLangName}</span>
          </button>
        </nav>
        <div className="s-header-actions">
          <button
            className="s-lang-toggle"
            onClick={toggleLang}
            aria-label={t.nav.toggleLang}
            title={t.nav.toggleLang}
          >
            <Globe size={15} />
            <span>{t.nav.switchLangName}</span>
          </button>
          <a className="s-github" href={REPO} target="_blank" rel="noreferrer">
            <Github size={16} />
            {t.nav.github}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </header>

      <main>
        <section className="s-hero s-container" aria-labelledby="hero-title">
          <div>
            <div className="s-eyebrow">
              <span className="s-status-dot" /> {t.hero.eyebrow}{' '}
              <span className="s-hero-edition">{t.hero.edition}</span>
            </div>
            <h1 id="hero-title">
              {t.hero.titleLine1}
              <br />
              <span>{t.hero.titleHighlight}</span>
            </h1>
            <p className="s-hero-description">{t.hero.description}</p>
            <div className="s-hero-actions">
              <a className="s-primary" href="#learn">
                {t.hero.startExplore}
                <ArrowDown size={16} />
              </a>
              <a className="s-text-link" href="#demo">
                {t.hero.tryDemo}
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
          <div className="s-hero-note">
            <div className="s-note-top">
              <span>{t.hero.keyIdea}</span>
              <span>↗</span>
            </div>
            <h2>
              {t.hero.noteTitle1}
              <br />
              {t.hero.noteTitle2}
            </h2>
            <p>{t.hero.noteDesc}</p>
            <div className="s-note-loop">
              <span>{t.hero.userAction}</span>
              <ArrowRight size={15} />
              <span>{t.hero.worker}</span>
              <ArrowRight size={15} />
              <span>{t.hero.uiUpdate}</span>
              <i />
            </div>
            <div className="s-note-bottom">
              <Code2 size={14} />
              <span>{t.hero.noteBottom}</span>
            </div>
          </div>
        </section>

        <div className="s-intro-strip s-container">
          <span>
            <BookOpen size={15} />
            {t.strip.sixLessons}
          </span>
          <span>{t.strip.middle}</span>
          <a href="#learn">
            {t.strip.scrollExplore} <ArrowDown size={12} />
          </a>
        </div>

        <section className="s-workbench s-container" id="learn" aria-label="机制教学与交互实验">
          <aside className="s-chapters">
            <div className="s-chapter-label">{t.chapters.title}</div>
            <nav aria-label="机制章节">
              {lessons.map((item, index) => (
                <button
                  key={item.id}
                  aria-current={chapter === index ? 'step' : undefined}
                  onClick={() => choose(index)}
                >
                  <span>0{index + 1}</span>
                  {item.short}
                  <ChevronRight size={13} />
                </button>
              ))}
            </nav>
            <div className="s-sidebar-note">
              <span className="s-status-dot" />
              <p>
                {t.chapters.sidebarNote1}
                <br />
                {t.chapters.sidebarNote2}
              </p>
              <span>
                {t.chapters.sidebarNoteSub1}
                <br />
                {t.chapters.sidebarNoteSub2}
              </span>
            </div>
            <a
              className="s-sidebar-source"
              href={sourceLink('docs/architecture.md')}
              target="_blank"
              rel="noreferrer"
            >
              {t.chapters.readDoc}
              <ArrowUpRight size={13} />
            </a>
          </aside>
          <div className="s-lesson-content">
            <div className="s-lesson-topline">
              <span>
                {t.chapters.chapterPrefix}
                {chapter + 1} <i>/</i> {lesson.eyebrow}
              </span>
              <span>{t.chapters.learnByDoing}</span>
            </div>
            <h2 className="s-lesson-title">{lesson.name}</h2>
            <p className="s-lesson-description">{lesson.description}</p>

            <div className="s-diagram-panel">
              <div className="s-diagram-toolbar">
                <div className="s-diagram-legend">
                  <span>
                    <i />
                    {t.diagram.legendData}
                  </span>
                  <span>
                    <i />
                    {t.diagram.legendEvent}
                  </span>
                </div>
                <div className="s-segment" aria-label={t.diagram.viewAngle}>
                  <button aria-pressed={!flat} onClick={() => setFlat(false)}>
                    {t.diagram.view25D}
                  </button>
                  <button aria-pressed={flat} onClick={() => setFlat(true)}>
                    {t.diagram.viewFlat}
                  </button>
                </div>
              </div>
              <ArchitectureDiagram
                selected={selected}
                onSelect={setSelected}
                flat={flat}
                stages={stages}
              />
              <div className="s-layer-inspector" aria-live="polite">
                <div className="s-layer-number">
                  0{selected + 1}
                  <span>{stage.english}</span>
                </div>
                <div className="s-layer-description">
                  <h3>
                    {stage.name}
                    <span>{stage.role}</span>
                  </h3>
                  <p>{stage.detail}</p>
                  <a href={sourceLink(stage.file)} target="_blank" rel="noreferrer">
                    {stage.file}
                    <ArrowUpRight size={12} />
                  </a>
                </div>
                <pre>
                  <code>{stage.code}</code>
                </pre>
              </div>
            </div>

            <MechanismLab key={`${lesson.id}-${lang}`} lesson={lesson.id} />

            <div className="s-chapter-pagination">
              <button disabled={chapter === 0} onClick={() => choose(chapter - 1, true)}>
                <ArrowLeft size={15} />
                {t.chapters.prevChapter}
              </button>
              <span>
                0{chapter + 1} / 0{lessons.length}
              </span>
              {chapter < lessons.length - 1 ? (
                <button onClick={() => choose(chapter + 1, true)}>
                  {t.chapters.nextChapter}
                  {lessons[chapter + 1].short}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <a href="#demo">
                  {t.chapters.enterDemo}
                  <ArrowRight size={15} />
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="s-demo-section" id="demo" aria-labelledby="demo-title">
          <div className="s-container">
            <div className="s-section-label">
              {t.demo.sectionLabel} <span>{t.demo.sectionSub}</span>
            </div>
            <div className="s-demo-heading">
              <div>
                <h2 id="demo-title">{t.demo.title}</h2>
                <p>{t.demo.desc}</p>
              </div>
              <a className="s-control" href={demoUrl} target="_blank" rel="noreferrer">
                {t.demo.openExternal}
                <ExternalLink size={15} />
              </a>
            </div>
            <div className="s-demo-shell" ref={demoRef}>
              <div className="s-demo-toolbar">
                <span className="s-window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{t.demo.windowTitle}</span>
                <button
                  aria-label={t.demo.fullscreen}
                  onClick={() => {
                    if (demoRef.current?.requestFullscreen)
                      void demoRef.current
                        .requestFullscreen()
                        .catch(() => setFullscreenError(true));
                    else setFullscreenError(true);
                  }}
                >
                  <Maximize2 size={15} />
                </button>
              </div>
              <div className="s-demo-disclosure">
                <span>
                  <span className="s-status-dot" /> {t.demo.browserDemoBadge}
                </span>
                <span>{t.demo.scenarioBadge}</span>
              </div>
              {!demoLoaded && <div className="s-demo-loading">{t.demo.loading}</div>}
              <iframe
                src={demoUrl}
                title={t.demo.iframeTitle}
                loading="lazy"
                onLoad={() => setDemoLoaded(true)}
                allow="clipboard-write; fullscreen"
              />
            </div>
            {fullscreenError && (
              <p className="s-footnote" role="status">
                {t.demo.fullscreenError}
              </p>
            )}
            <div className="s-demo-guide">
              <span>
                <b>01</b>
                {t.demo.step1}
              </span>
              <ChevronRight size={13} />
              <span>
                <b>02</b>
                {t.demo.step2}
              </span>
              <ChevronRight size={13} />
              <span>
                <b>03</b>
                {t.demo.step3}
              </span>
            </div>
            <p className="s-demo-limit">{t.demo.limitNote}</p>
          </div>
        </section>

        <section className="s-about s-container" id="about" aria-labelledby="about-title">
          <div>
            <div className="s-section-label">{t.about.sectionLabel}</div>
            <h2 id="about-title">
              {t.about.titleLine1}
              <br />
              {t.about.titleLine2}
            </h2>
            <p>{t.about.desc}</p>
            <a className="s-primary" href={REPO} target="_blank" rel="noreferrer">
              <Github size={16} />
              {t.about.viewGithub}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="s-about-details">
            <h3>{t.about.pocIncludesTitle}</h3>
            <ul>
              <li>
                <Check size={15} />
                {t.about.pocIncludes1(COMPONENT_COUNT)}
              </li>
              <li>
                <Check size={15} />
                {t.about.pocIncludes2}
              </li>
              <li>
                <Check size={15} />
                {t.about.pocIncludes3}
              </li>
            </ul>
            <details>
              <summary>
                {t.about.diffSummary}
                <ChevronRight size={15} />
              </summary>
              <p>{t.about.diffContent}</p>
            </details>
            <details>
              <summary>
                {t.about.securitySummary}
                <ChevronRight size={15} />
              </summary>
              <p>{t.about.securityContent}</p>
            </details>
            <div className="s-references">
              <span>{t.about.references}</span>
              <a
                href="https://www.openui.com/blog/how-chatgpt-intelligent-ui-works"
                target="_blank"
                rel="noreferrer"
              >
                {t.about.ref1}
                <ArrowUpRight size={13} />
              </a>
              <a
                href="https://kejun.github.io/demos/chatgpt-intelligent-ui/"
                target="_blank"
                rel="noreferrer"
              >
                {t.about.ref2}
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="s-footer s-container">
        <Brand />
        <p>{t.footer.tagline}</p>
        <a href="#top">
          {t.footer.backToTop}
          <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}

export default function Showcase() {
  return (
    <I18nProvider>
      <ShowcaseContent />
    </I18nProvider>
  );
}
