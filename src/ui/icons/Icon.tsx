import type { IconDef } from "./icons";

interface IconProps {
  icon: IconDef;
  size?: number;
  class?: string;
  style?: Record<string, string>;
  flip?: "horizontal" | "vertical";
}

export function Icon({ icon, size = 16, class: className, style, flip }: IconProps) {
  const transform = flip === "horizontal"
    ? "scale(-1, 1)"
    : flip === "vertical"
    ? "scale(1, -1)"
    : undefined;

  const transformOrigin = flip ? "center" : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={icon.viewBox ?? "0 0 16 16"}
      fill="none"
      class={className}
      style={{
        ...style,
        transform,
        transformOrigin,
      }}
    >
      {icon.paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      ))}
    </svg>
  );
}
