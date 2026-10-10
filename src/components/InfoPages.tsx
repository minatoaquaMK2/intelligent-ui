import {
  ArrowDown,
  ArrowUpRight,
  Box,
  Braces,
  Check,
  Code2,
  Cpu,
  Database,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { catalog } from '../core/catalog';
import { useI18n } from '../i18n';

export function CatalogPage() {
  const { t } = useI18n();

  return (
    <div className="info-page">
      <div className="page-eyebrow">
        <Box size={14} />
        COMPONENT CATALOG
      </div>
      <h1>{t.infoPages.catalogTitle}</h1>
      <p className="page-intro">{t.infoPages.catalogDesc}</p>
      <div className="catalog-summary">
        <span>
          <Check size={14} />
          {t.infoPages.catalogRegistered(Object.keys(catalog).length)}
        </span>
        <span>
          <ShieldCheck size={14} />
          {t.infoPages.catalogWhitelist}
        </span>
        <span>
          <Layers size={14} />
          {t.infoPages.catalogTokens}
        </span>
      </div>
      <div className="catalog-grid">
        {Object.entries(catalog).map(([name, props], index) => (
          <article className="catalog-card" key={name}>
            <div>
              <span className="component-symbol">
                {index < 3 ? (
                  <Layers size={19} />
                ) : index < 8 ? (
                  <Code2 size={19} />
                ) : index < 11 ? (
                  <Braces size={19} />
                ) : (
                  <Box size={19} />
                )}
              </span>
              <code>&lt;{name} /&gt;</code>
            </div>
            <h3>{t.infoPages.componentNames[name] || name}</h3>
            <div className="prop-chips">
              {Object.entries(props).map(([key, rule]) => (
                <span key={key} title={Array.isArray(rule) ? rule.join(' | ') : String(rule)}>
                  {key}
                </span>
              ))}
              {!Object.keys(props).length && <span>{t.infoPages.noProps}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ArchitecturePage() {
  const { t } = useI18n();

  const steps = [
    {
      icon: Sparkles,
      label: '01 · GENERATE',
      title: t.infoPages.step1Title,
      text: t.infoPages.step1Text,
      code: '{@state threshold = 80}\n<slider value={threshold} onChange={setThreshold} />',
    },
    {
      icon: Code2,
      label: '02 · COMPILE',
      title: t.infoPages.step2Title,
      text: t.infoPages.step2Text,
      code: '{ program, constants, diagnostics, fallbackMarkdown }',
    },
    {
      icon: Cpu,
      label: '03 · EXECUTE',
      title: t.infoPages.step3Title,
      text: t.infoPages.step3Text,
      code: 'EVENT → setThreshold(85) → SET gpus.threshold = 85',
    },
    {
      icon: Layers,
      label: '04 · RENDER',
      title: t.infoPages.step4Title,
      text: t.infoPages.step4Text,
      code: 'UI event → handler ID → Worker → UI operations',
    },
  ];

  return (
    <div className="info-page architecture-page">
      <div className="page-eyebrow">
        <Layers size={14} />
        HOW IT WORKS
      </div>
      <h1>{t.infoPages.architectureTitle}</h1>
      <p className="page-intro">{t.infoPages.architectureSubtitle}</p>
      <div className="architecture-flow">
        {steps.map((step, index) => (
          <div key={step.label}>
            <article>
              <span className="architecture-icon">
                <step.icon size={23} />
              </span>
              <div>
                <span className="step-label">{step.label}</span>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
                <code>{step.code}</code>
              </div>
            </article>
            {index < steps.length - 1 && <ArrowDown className="flow-down" size={20} />}
          </div>
        ))}
      </div>
      <div className="architecture-notes">
        <div>
          <Database size={20} />
          <h3>{t.infoPages.archDataTitle}</h3>
          <p>{t.infoPages.archDataText}</p>
        </div>
        <div>
          <Radio size={20} />
          <h3>{t.infoPages.archObservableTitle}</h3>
          <p>{t.infoPages.archObservableText}</p>
        </div>
        <div>
          <ShieldCheck size={20} />
          <h3>{t.infoPages.archBoundaryTitle}</h3>
          <p>{t.infoPages.archBoundaryText}</p>
        </div>
      </div>
      <a
        className="reference-link"
        href="https://github.com/minatoaquaMK2/intelligent-ui/blob/main/docs/architecture.md"
        target="_blank"
        rel="noreferrer"
      >
        {t.infoPages.readOpenUiArticle} <ArrowUpRight size={16} />
      </a>
      <a
        className="reference-link"
        href="https://github.com/minatoaquaMK2/intelligent-ui/blob/main/src/core/runtime.ts"
        target="_blank"
        rel="noreferrer"
      >
        {t.infoPages.openUiReference} <ArrowUpRight size={16} />
      </a>
      <p className="page-intro">{t.infoPages.openUiNote}</p>
    </div>
  );
}
