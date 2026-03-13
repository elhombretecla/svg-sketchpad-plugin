import { useEffect, useState } from "preact/hooks";
import { Icon } from "../icons/Icon";
import { ICON_STROKE_WIDTH, ICON_ARROW_DOWN } from "../icons/icons";
import { editorStore } from "../state/editorStore";
import type {
  StrokePosition,
  StrokeType,
} from "../state/editorStore";

export function Inspector() {
  const [strokeColor, setStrokeColor] = useState(
    editorStore.getState().style.stroke
  );
  const [strokeWidth, setStrokeWidth] = useState(
    editorStore.getState().style.strokeWidth
  );
  const [strokeOpacity, setStrokeOpacity] = useState(
    editorStore.getState().strokeOpacity
  );
  const [strokePosition, setStrokePosition] = useState<StrokePosition>(
    editorStore.getState().strokePosition
  );
  const [strokeType, setStrokeType] = useState<StrokeType>(
    editorStore.getState().strokeType
  );
  const [fillColor, setFillColor] = useState(
    editorStore.getState().fillColor
  );
  const [fillOpacity, setFillOpacity] = useState(
    editorStore.getState().fillOpacity
  );
  const [fillEnabled, setFillEnabled] = useState(
    editorStore.getState().fillEnabled
  );

  useEffect(() => {
    return editorStore.subscribe((state) => {
      setStrokeColor(state.style.stroke);
      setStrokeWidth(state.style.strokeWidth);
      setStrokeOpacity(state.strokeOpacity);
      setStrokePosition(state.strokePosition);
      setStrokeType(state.strokeType);
      setFillColor(state.fillColor);
      setFillOpacity(state.fillOpacity);
      setFillEnabled(state.fillEnabled);
    });
  }, []);

  const s = () => editorStore.getState();

  const formatHex = (color: string) => color.replace("#", "").toUpperCase();

  return (
    <aside class="inspector">
      {/* STROKE */}
      <div class="inspector-section">
        <h3 class="inspector-label headline-s">STROKE</h3>

        <div class="inspector-color-row">
          <input
            type="color"
            class="color-swatch"
            value={strokeColor}
            onInput={(e) =>
              s().setStyle({ stroke: (e.target as HTMLInputElement).value })
            }
          />
          <span class="color-hex body-s">#{formatHex(strokeColor)}</span>
          <span class="color-sep body-xs">%</span>
          <input
            type="number"
            class="opacity-input body-s"
            min="0"
            max="100"
            value={strokeOpacity}
            onInput={(e) =>
              s().setStrokeOpacity(
                parseInt((e.target as HTMLInputElement).value) || 0
              )
            }
          />
        </div>

        <div class="inspector-stroke-row">
          <div class="select-wrapper">
            <select
              class="inspector-select body-xs"
              value={strokeType}
              onChange={(e) =>
                s().setStrokeType(
                  (e.target as HTMLSelectElement).value as StrokeType
                )
              }
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
            <Icon icon={ICON_ARROW_DOWN} size={12} class="select-arrow" />
          </div>

          <div class="select-wrapper">
            <select
              class="inspector-select body-xs"
              value={strokePosition}
              onChange={(e) =>
                s().setStrokePosition(
                  (e.target as HTMLSelectElement).value as StrokePosition
                )
              }
            >
              <option value="center">Center</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
            <Icon icon={ICON_ARROW_DOWN} size={12} class="select-arrow" />
          </div>

          <div class="stroke-width-group">
            <Icon icon={ICON_STROKE_WIDTH} size={14} class="stroke-width-icon" />
            <input
              type="number"
              class="stroke-width-input body-s"
              min="0"
              max="100"
              step="0.5"
              value={strokeWidth}
              onInput={(e) =>
                s().setStyle({
                  strokeWidth: parseFloat(
                    (e.target as HTMLInputElement).value
                  ) || 0,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* FILL */}
      <div class="inspector-section">
        <h3 class="inspector-label headline-s">FILL</h3>

        {fillEnabled ? (
          <div class="inspector-color-row">
            <input
              type="color"
              class="color-swatch"
              value={fillColor}
              onInput={(e) =>
                s().setFillColor((e.target as HTMLInputElement).value)
              }
            />
            <span class="color-hex body-s">#{formatHex(fillColor)}</span>
            <span class="color-sep body-xs">%</span>
            <input
              type="number"
              class="opacity-input body-s"
              min="0"
              max="100"
              value={fillOpacity}
              onInput={(e) =>
                s().setFillOpacity(
                  parseInt((e.target as HTMLInputElement).value) || 0
                )
              }
            />
          </div>
        ) : (
          <span class="body-s" style={{ color: "var(--foreground-secondary)" }}>
            No fill
          </span>
        )}
      </div>
    </aside>
  );
}
