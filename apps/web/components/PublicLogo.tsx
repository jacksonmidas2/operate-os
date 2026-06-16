/**
 * PublicLogo — a programmatic SVG monogram mark.
 *
 * Generic enough that every tenant gets a clean logo from just their name +
 * brand colors. No upload UI required for v1.
 *
 * Special-cases brands with `&` in them (e.g. "M&M Cleaning" → "M&M"),
 * otherwise takes initials of the first two significant words.
 */

export function PublicLogo({
  brand,
  primary,
  accent,
  size = 40,
  className,
}: {
  brand: string;
  primary: string;
  accent: string;
  size?: number;
  className?: string;
}) {
  const monogram = deriveMonogram(brand);
  const gradientId = `pl-grad-${slugify(brand)}`;
  const sparkleId = `pl-sparkle-${slugify(brand)}`;

  // Auto-shrink font when monogram is wider (e.g. "M&M" vs "M")
  const fontSize = monogram.length <= 1 ? 28 : monogram.length === 2 ? 22 : 18;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`${brand} logo`}
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
        {/* Subtle inner highlight for depth */}
        <radialGradient id={sparkleId} cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Rounded badge */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gradientId})`} />
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${sparkleId})`} />

      {/* Subtle inner border for crispness */}
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="11.5"
        stroke="#ffffff"
        strokeOpacity="0.12"
      />

      {/* Monogram */}
      <text
        x="24"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight={700}
        fontSize={fontSize}
        fill="#1A1A1F"
        letterSpacing={monogram.length >= 3 ? "-0.04em" : "-0.02em"}
      >
        {monogram}
      </text>

      {/* Cleaning sparkle dot — top right */}
      <circle cx="38" cy="11" r="2.6" fill="#ffffff" fillOpacity="0.92" />
      <circle cx="38" cy="11" r="4.4" fill="#ffffff" fillOpacity="0.18" />
    </svg>
  );
}

/**
 * Derive a punchy 1-3 character monogram from a brand name.
 *
 *   "M&M Cleaning Co LLC"     → "M&M"
 *   "ABC Cleaning Services"   → "AC"
 *   "Quick Wipe"              → "QW"
 *   "Sparkle"                 → "S"
 */
function deriveMonogram(brand: string): string {
  // Strip common legal suffixes
  const cleaned = brand
    .replace(/\b(Co|Inc|LLC|LLP|Corp|Corporation|Ltd|Limited|GmbH)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Special case: leading "X&X" pattern (M&M, J&J, A&A, etc.)
  const ampMatch = cleaned.match(/^([A-Za-z](?:&[A-Za-z]){1,2})\b/);
  if (ampMatch?.[1]) return ampMatch[1].toUpperCase();

  // Otherwise: first letters of first two significant words
  const words = cleaned.split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const second = words[1];
  if (!second) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
