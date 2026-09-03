type AvatarProps = {
  name?: string;
  initial?: string;
  size?: "normal" | "small";
  isOnline?: boolean;
};

export function Avatar({ name, initial, size = "normal", isOnline }: AvatarProps) {
  const displayInitial = initial ?? (name ? name.charAt(0).toUpperCase() : "?");
  const className = size === "small" ? "avatar small" : "avatar";

  return (
    <div className="avatar-wrapper">
      <span className={className}>{displayInitial}</span>
      {isOnline && <span className="online-badge" title="Online" />}
    </div>
  );
}

