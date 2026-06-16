/**
 * ClientMarquee — infinite-scroll wordmark strip of client names.
 *
 * Pure CSS animation (Tailwind keyframe). Pauses on hover. Content is
 * duplicated once so the loop is seamless when the first copy scrolls out
 * (translateX -50% lands the second copy at the original position).
 *
 * Wordmarks are styled — different fonts/weights per client give visual
 * variety without needing actual SVG logos. Drop in real logo assets
 * later by extending Client with a logoUrl column and swapping the text
 * for an <img>.
 */

interface WordmarkStyle {
  fontFamily: string;
  className?: string;
  letterSpacing: string;
  fontWeight: number;
  textTransform?: "uppercase" | "none" | "lowercase" | "capitalize";
  italic?: boolean;
}

/**
 * Hardcoded logo URLs for well-known brands. Sourced from Wikimedia Commons
 * (public domain or freely licensed marks). Each entry's `match` function
 * tests against the client's business name (lowercased).
 *
 * Rendered as <img> with a white silhouette filter so all logos sit cleanly
 * on the dark marquee track regardless of source color.
 *
 * To add a logo for a new client: add an entry below OR upload via the
 * (forthcoming) client edit form once logoUrl is on the Client model.
 */
const KNOWN_BRAND_LOGOS: Array<{
  match: (lower: string) => boolean;
  url: string;
  alt: string;
  /** Override render height; defaults to 32 */
  height?: number;
}> = [
  {
    match: (s) => s.includes("louis vuitton"),
    // Wikimedia thumb — only specific widths are accepted (250/500/960/1920)
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Louis_Vuitton_logo_and_wordmark.svg/500px-Louis_Vuitton_logo_and_wordmark.svg.png",
    alt: "Louis Vuitton",
    height: 36,
  },
  {
    match: (s) => s.includes("bloomingdale"),
    // SVG direct (Bloomingdale's logo is small + simple — SVG works inline)
    url: "https://upload.wikimedia.org/wikipedia/commons/6/68/Bloomingdale%27s_Logo.svg",
    alt: "Bloomingdale's",
    height: 22,
  },
];

function findLogo(name: string) {
  const lower = name.toLowerCase();
  return KNOWN_BRAND_LOGOS.find((l) => l.match(lower));
}

const STYLE_PRESETS: readonly WordmarkStyle[] = [
  // 0 — Luxury serif (Louis Vuitton vibe)
  {
    fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    letterSpacing: "0.32em",
    fontWeight: 500,
    textTransform: "uppercase",
  },
  // 1 — Editorial italic (Bloomingdales-y)
  {
    fontFamily: "Georgia, 'Times New Roman', serif",
    letterSpacing: "-0.01em",
    fontWeight: 400,
    italic: true,
  },
  // 2 — Tech / sans-serif modern (AVL Mobility)
  {
    fontFamily:
      "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    letterSpacing: "-0.02em",
    fontWeight: 700,
  },
  // 3 — Institutional (RHF — Retirement Housing Foundation)
  {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    letterSpacing: "0.22em",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  // 4 — Modern condensed
  {
    fontFamily: "'Oswald', 'Impact', sans-serif",
    letterSpacing: "0.06em",
    fontWeight: 500,
    textTransform: "uppercase",
  },
];

function pickPreset(name: string, index: number): WordmarkStyle {
  // Always-defined fallback (TS-friendly given STYLE_PRESETS has >0 entries)
  const fallback = STYLE_PRESETS[index % STYLE_PRESETS.length] ?? STYLE_PRESETS[0]!;
  const lower = name.toLowerCase();
  if (lower.includes("louis vuitton")) return STYLE_PRESETS[0] ?? fallback;
  if (lower.includes("bloomingdale")) return STYLE_PRESETS[1] ?? fallback;
  if (lower.includes("avl") || lower.includes("mobility") || lower.includes("technologies"))
    return STYLE_PRESETS[2] ?? fallback;
  if (lower.includes("rhf") || lower.includes("retirement") || lower.includes("foundation"))
    return STYLE_PRESETS[3] ?? fallback;
  return fallback;
}

function displayName(raw: string): string {
  // Trim noisy suffixes for visual cleanliness only
  return raw
    .replace(/\s+—\s+.*$/u, "") // "Bloomingdales — South Coast Plaza" → "Bloomingdales"
    .replace(/\b(Inc|LLC|LLP|Corp|Corporation|Co|Ltd|Limited)\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ClientMarquee({
  clients,
}: {
  clients: Array<{ id: string; businessName: string }>;
}) {
  if (clients.length === 0) return null;

  const items = clients.map((c, i) => ({
    id: c.id,
    label: displayName(c.businessName),
    preset: pickPreset(c.businessName, i),
    logo: findLogo(c.businessName),
  }));

  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-gray-400">
          Trusted by leading brands & property managers
        </p>

        <div
          className="group relative mt-8 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div
            className="flex w-max gap-16 animate-marquee group-hover:[animation-play-state:paused]"
            aria-hidden={false}
          >
            {/* Render twice for seamless infinite loop */}
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className="flex shrink-0 items-center gap-16"
                aria-hidden={copy === 1 ? true : undefined}
              >
                {items.map((it) => (
                  <li
                    key={`${copy}-${it.id}`}
                    className="flex shrink-0 items-center select-none whitespace-nowrap"
                  >
                    {it.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.logo.url}
                        alt={it.logo.alt}
                        style={{
                          height: `${it.logo.height ?? 32}px`,
                          width: "auto",
                          filter:
                            "brightness(0) invert(1) opacity(0.85)",
                          transition: "filter 0.2s",
                        }}
                        className="hover:[filter:brightness(0)_invert(1)_opacity(1)]"
                      />
                    ) : (
                      <span
                        className="text-lg text-gray-300 transition-colors hover:text-white sm:text-xl"
                        style={{
                          fontFamily: it.preset.fontFamily,
                          letterSpacing: it.preset.letterSpacing,
                          fontWeight: it.preset.fontWeight,
                          textTransform: it.preset.textTransform,
                          fontStyle: it.preset.italic ? "italic" : "normal",
                        }}
                      >
                        {it.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
