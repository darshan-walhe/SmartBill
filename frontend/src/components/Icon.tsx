interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
}

// Wraps Google's Material Symbols Outlined font. Using the icon font (as the
// Stitch mockups do) instead of mapping every icon to a lucide-react
// equivalent means icon names copy directly from the mockup HTML
// (e.g. "receipt_long", "local_shipping", "admin_panel_settings") with zero
// translation — one less place for the two to drift apart.
export function Icon({ name, className = "", filled = false, size = 24 }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        fontSize: size,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
