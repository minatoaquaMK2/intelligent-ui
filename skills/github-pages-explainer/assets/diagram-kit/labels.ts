import type { DiagramLabels } from "./types";

export const defaultLabels: DiagramLabels = {
  ariaLabel: "Interactive system diagram. Select a module to inspect it.",
  viewAngle: "Diagram perspective",
  view25D: "2.5D",
  viewFlat: "Flat",
  spacing: "Layer spacing",
  focusView: "Focus view",
  exitFocus: "Exit focus",
  legendData: "Program / Data",
  legendEvent: "Events / Actions",
  note: "Select a module to inspect it. Scroll horizontally on small screens. Steps belong to this diagram; arrows illustrate the mechanism.",
  step: "STEP",
  moduleLabel: "Diagram steps",
  previousStep: "Previous step",
  nextStep: "Next step",
  autoplay: "Autoplay",
  stopAutoplay: "Pause tour",
  pauseMotion: "Pause motion",
  resumeMotion: "Resume motion",
  reducedMotion: "Reduced motion enabled",
  selectStep: (name) => `Inspect step: ${name}`,
};
