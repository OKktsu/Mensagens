type AvatarProps = {
  name?: string;
  initial?: string;
  size?: "normal" | "small";
};

export function Avatar({ name, initial, size = "normal" }: AvatarProps) {
  const displayInitial = initial ?? (name ? name.charAt(0).toUpperCase() : "?");
  const className = size === "small" ? "avatar small" : "avatar";

  return <span className={className}>{displayInitial}</span>;
}
