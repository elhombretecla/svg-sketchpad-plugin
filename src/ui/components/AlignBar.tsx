import { Icon } from "../icons/Icon";
import {
  ICON_ALIGN_LEFT,
  ICON_ALIGN_CENTER_H,
  ICON_ALIGN_RIGHT,
  ICON_ALIGN_TOP,
  ICON_ALIGN_CENTER_V,
  ICON_ALIGN_BOTTOM,
  ICON_DISTRIBUTE_H,
  ICON_DISTRIBUTE_V,
} from "../icons/icons";

interface AlignAction {
  icon: typeof ICON_ALIGN_LEFT;
  title: string;
  action: string;
}

const ALIGN_ACTIONS: AlignAction[] = [
  { icon: ICON_ALIGN_LEFT, title: "Align left", action: "align-left" },
  { icon: ICON_ALIGN_CENTER_H, title: "Align center horizontally", action: "align-center-h" },
  { icon: ICON_ALIGN_RIGHT, title: "Align right", action: "align-right" },
  { icon: ICON_ALIGN_TOP, title: "Align top", action: "align-top" },
  { icon: ICON_ALIGN_CENTER_V, title: "Align center vertically", action: "align-center-v" },
  { icon: ICON_ALIGN_BOTTOM, title: "Align bottom", action: "align-bottom" },
  { icon: ICON_DISTRIBUTE_H, title: "Distribute horizontally", action: "distribute-h" },
  { icon: ICON_DISTRIBUTE_V, title: "Distribute vertically", action: "distribute-v" },
];

export function AlignBar() {
  const handleAction = (_action: string) => {
    // TODO: implement alignment actions
  };

  return (
    <div class="align-bar">
      {ALIGN_ACTIONS.map((item) => (
        <button
          key={item.action}
          class="toolbar-btn"
          onClick={() => handleAction(item.action)}
          title={item.title}
        >
          <Icon icon={item.icon} />
        </button>
      ))}
    </div>
  );
}
