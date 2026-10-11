export type Language = 'zh' | 'en';

export type LessonId =
  'pipeline' | 'state' | 'streaming' | 'data' | 'boundary' | 'action' | 'evidence';
export type StageId = 'source' | 'compiler' | 'runtime' | 'host' | 'data';

export interface LessonTranslation {
  id: LessonId;
  short: string;
  name: string;
  eyebrow: string;
  description: string;
  takeaway: string;
  experiment: string;
  instruction: string;
}

export interface StageTranslation {
  id: StageId;
  name: string;
  english: string;
  role: string;
  color: string;
  file: string;
  detail: string;
  code: string;
}

export interface ExampleItem {
  id: 'rack' | 'gpu' | 'network';
  title: string;
  description: string;
  prompt: string;
  tag: string;
}

export interface AppTranslations {
  header: {
    brandPrefix: string;
    brandStrong: string;
    navPlayground: string;
    navCatalog: string;
    navArchitecture: string;
    statusOnline: string;
    statusOffline: string;
    connectModel: string;
    devPanel: string;
    toggleDevPanel: string;
  };
  sidebar: {
    newChat: string;
    newBadge: string;
    mainNav: string;
    examplesLabel: string;
    currentChat: string;
    keyIdeaTitle: string;
    keyIdeaDesc: string;
    howItWorks: string;
    referenceArticle: string;
  };
  prompt: {
    inputAria: string;
    placeholderNext: string;
    placeholderDefault: string;
    modeAria: string;
    modeDemo: string;
    modeLive: string;
    notConfigured: string;
    noKeyNeeded: string;
    send: string;
    stop: string;
    stopAria: string;
    sendAria: string;
    shiftEnterHint: string;
    footerTipDemo: string;
    footerTipLive: string;
    currentView: string;
  };
  hero: {
    titleLine1: string;
    titleHighlight: string;
    desc1: string;
    desc2: string;
    chooseScenario: string;
    orDescribe: string;
    pillSimulated: string;
    pillLocal: string;
    pillLive: string;
    stepDescribe: string;
    stepCompile: string;
    stepExecute: string;
    stepInteract: string;
  };
  chat: {
    srTitle: string;
    userLabel: string;
    contextPrefix: string;
    inspectInterface: string;
    inspectAria: (n: number) => string;
    fallbackNotice: string;
    waitingContent: string;
    streamingHintGrowing: string;
    streamingHintBuilding: string;
    retry: string;
    stoppedLabel: string;
    viewSwitchAria: string;
    viewNative: string;
    viewMarkdown: string;
    interactionsCount: (n: number) => string;
    copySource: string;
    copySourceAria: (n: number) => string;
    scrollToBottom: string;
  };
  modelModal: {
    title: string;
    desc: string;
    configured: (m: string) => string;
    demoMode: string;
    step1: string;
    step2: string;
    step3: string;
    notice: string;
    close: string;
  };
  toasts: {
    copied: string;
    copyError: string;
    recompiled: string;
    copiedDsl: string;
    copyDslError: string;
  };
}

export interface InspectorTranslations {
  title: string;
  close: string;
  tabsAria: string;
  tabSource: string;
  tabRuntime: string;
  tabData: string;
  tabEvents: string;
  copiedDsl: string;
  copyError: string;
  emptyTitle: string;
  emptyDesc: string;
  emptyFooter: string;
  statusStreaming: string;
  statusError: string;
  statusReady: string;
  edit: string;
  cancel: string;
  copyDsl: string;
  editDslAria: string;
  compiling: string;
  compileAndApply: string;
  editNote: string;
  waitingFirstChunk: string;
  diagnosticsTitle: string;
  componentsPassed: string;
  viewIrSummary: string;
  modelCalls: string;
  localInteractions: string;
  duration: string;
  timesUnit: string;
  keyedStateTitle: string;
  keyedStateSub: string;
  noState: string;
  renderOpsTitle: string;
  renderOpsCount: (n: number) => string;
  renderOpsDesc: string;
  noUiChanges: string;
  runtimeDiagnostics: string;
  runtimeNote: string;
  appDataTitle: string;
  appDataSub: string;
  appDataDesc: string;
  constantsTitle: (count: number) => string;
  eventStreamTitle: string;
  eventStreamChunks: (count: number) => string;
  eventStreamDesc: string;
  sandboxedEval: string;
  noDynamicCode: string;
}

export interface InfoPagesTranslations {
  catalogTitle: string;
  catalogDesc: string;
  catalogRegistered: (count: number) => string;
  catalogWhitelist: string;
  catalogTokens: string;
  noProps: string;
  componentNames: Record<string, string>;
  architectureTitle: string;
  architectureSubtitle: string;
  step1Title: string;
  step1Text: string;
  step2Title: string;
  step2Text: string;
  step3Title: string;
  step3Text: string;
  step4Title: string;
  step4Text: string;
  archDataTitle: string;
  archDataText: string;
  archObservableTitle: string;
  archObservableText: string;
  archBoundaryTitle: string;
  archBoundaryText: string;
  readOpenUiArticle: string;
  openUiReference: string;
  openUiNote: string;
}

export interface Translations {
  meta: {
    title: string;
    description: string;
  };
  brand: {
    title: string;
    sub: string;
    ariaHome: string;
  };
  nav: {
    skip: string;
    menuOpen: string;
    menuClose: string;
    mechanisms: string;
    demo: string;
    about: string;
    github: string;
    toggleLang: string;
    currentLangName: string;
    switchLangName: string;
  };
  hero: {
    eyebrow: string;
    edition: string;
    titleLine1: string;
    titleHighlight: string;
    description: string;
    startExplore: string;
    tryDemo: string;
    keyIdea: string;
    noteTitle1: string;
    noteTitle2: string;
    noteDesc: string;
    userAction: string;
    worker: string;
    uiUpdate: string;
    noteBottom: string;
  };
  strip: {
    lessonCount: string;
    middle: string;
    scrollExplore: string;
  };
  chapters: {
    title: string;
    sidebarNote1: string;
    sidebarNote2: string;
    sidebarNoteSub1: string;
    sidebarNoteSub2: string;
    readDoc: string;
    chapterPrefix: string;
    learnByDoing: string;
    prevChapter: string;
    nextChapter: string;
    enterDemo: string;
  };
  diagram: {
    ariaLabel: string;
    viewAngle: string;
    view25D: string;
    viewFlat: string;
    legendData: string;
    legendEvent: string;
    dsl: string;
    ir: string;
    uiOps: string;
    dataFeed: string;
    handlerId: string;
    explicitAction: string;
    nextTurn: string;
    focusPrefix: string;
    moduleLabel: string;
    pauseMotion: string;
    resumeMotion: string;
    spacing: string;
    focusView: string;
    exitFocus: string;
    previousStep: string;
    nextStep: string;
    autoplay: string;
    stopAutoplay: string;
    step: string;
    selectStep: (name: string) => string;
    routeLabel: string;
    nativeRoute: string;
    webRoute: string;
    webRouteNote: string;
    note: string;
    pathDescriptions: Record<LessonId, string>;
    dataLane: string;
    execLayer: string;
  };
  lab: {
    tryItYourself: string;
    badgeSubtitle: string;
    resetLab: string;
    recompileKeepState: string;
    recompileCount: (n: number) => string;
    phaseSource: string;
    textGrowing: string;
    incompleteTag: string;
    completeComponent: string;
    playStream: string;
    stopStream: string;
    resumeStream: string;
    textStart: string;
    artifacts: string;
    noFallback: string;
    businessScenario: string;
    scenarios: { rack: string; gpu: string; network: string };
    observation: string;
    traceSource: string;
    traceCompiler: string;
    traceWorker: string;
    characters: string;
    roots: string;
    diagnostics: string;
    programStatus: string;
    programUnchanged: string;
    patchField: string;
    evidenceNeedsInteraction: string;

    simData: string;
    snapshotA: string;
    snapshotB: string;
    validationCases: string;
    validExpr: string;
    unknownWidget: string;
    accessWindow: string;
    latestUpdate: (field: string) => string;
    presetSourceMode: string;
    tabs: {
      source: string;
      compiled: string;
      data: string;
      runtime: string;
      fallback: string;
    };
    copyTooltip: string;
    copySuccess: string;
    copyError: string;
    compiledSuccess: (count: number) => string;
    liveOutput: string;
    workerToReact: string;
    localEvents: string;
    modelRequests: string;
    threshold: string;
    issueNewTurn: string;
    noActionDefault: string;
    actionNote: string;
    footnoteState: string;
    footnoteBoundary: string;
    footnoteStreaming: string;
    evidenceTitle: string;
    evidenceCompiled: string;
    evidenceWorker: string;
    evidenceInteraction: string;
    evidencePending: string;
    footnoteEvidence: string;
  };
  demo: {
    sectionLabel: string;
    sectionSub: string;
    title: string;
    desc: string;
    openExternal: string;
    windowTitle: string;
    fullscreen: string;
    browserDemoBadge: string;
    scenarioBadge: string;
    loading: string;
    iframeTitle: string;
    fullscreenError: string;
    step1: string;
    step2: string;
    step3: string;
    limitNote: string;
  };
  about: {
    sectionLabel: string;
    titleLine1: string;
    titleLine2: string;
    desc: string;
    viewGithub: string;
    pocIncludesTitle: string;
    pocIncludes1: (count: number) => string;
    pocIncludes2: string;
    pocIncludes3: string;
    diffSummary: string;
    diffContent: string;
    securitySummary: string;
    securityContent: string;
    references: string;
    ref1: string;
    ref2: string;
  };
  footer: {
    tagline: string;
    backToTop: string;
  };
  app: AppTranslations;
  inspector: InspectorTranslations;
  infoPages: InfoPagesTranslations;
  examples: ExampleItem[];
}
