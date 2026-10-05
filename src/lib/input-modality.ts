let tabNavigation = false;

export function isTabNavigation() {
  return tabNavigation;
}

export function initInputModality() {
  const root = document.documentElement;
  root.dataset.inputModality = "pointer";

  document.addEventListener(
    "pointerdown",
    () => {
      tabNavigation = false;
      root.dataset.inputModality = "pointer";
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      tabNavigation = event.key === "Tab";
      root.dataset.inputModality = "keyboard";
    },
    true,
  );
}
