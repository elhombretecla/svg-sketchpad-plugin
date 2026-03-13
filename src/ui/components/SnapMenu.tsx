import { useEffect, useState } from "preact/hooks";
import { editorStore } from "../state/editorStore";
import type { SnapMode } from "../state/editorStore";

const SNAP_OPTIONS: { mode: SnapMode; label: string }[] = [
  { mode: "pixels", label: "Snap to pixels" },
  { mode: "grid", label: "Snap to grid" },
  { mode: "nodes", label: "Snap to nodes" },
  { mode: "disabled", label: "Disabled" },
];

export function SnapMenu() {
  const [active, setActive] = useState<SnapMode>(editorStore.getState().snapMode);

  useEffect(() => {
    return editorStore.subscribe((state) => {
      setActive(state.snapMode);
    });
  }, []);

  const handleSelect = (mode: SnapMode) => {
    editorStore.getState().setSnapMode(mode);
    editorStore.getState().setShowSnapMenu(false);
  };

  return (
    <div class="snap-menu">
      {SNAP_OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          class={`snap-option body-s ${active === opt.mode ? "active" : ""}`}
          onClick={() => handleSelect(opt.mode)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
