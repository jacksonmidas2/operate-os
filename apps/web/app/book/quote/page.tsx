import Link from "next/link";

/**
 * Instant-quote calculator. Pricing rule v1:
 *   base 80 + 30*bedrooms + 20*bathrooms + 0.10*sqft (clamped)
 * Adjust as we learn what converts.
 */
function priceCents({
  bedrooms,
  bathrooms,
  sqft,
}: {
  bedrooms: number;
  bathrooms: number;
  sqft: number;
}): number {
  const dollars = Math.max(
    100,
    Math.min(800, 80 + 30 * bedrooms + 20 * bathrooms + 0.1 * sqft),
  );
  return Math.round(dollars * 100);
}

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<{ bedrooms?: string; bathrooms?: string; sqft?: string }>;
}) {
  const sp = await searchParams;
  const bedrooms = Number(sp.bedrooms ?? "2");
  const bathrooms = Number(sp.bathrooms ?? "1");
  const sqft = Number(sp.sqft ?? "900");
  const cents = priceCents({ bedrooms, bathrooms, sqft });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Tell us about your space
        </h1>
        <p className="mt-2 text-gray-400">
          Adjust the sliders. The quote updates instantly.
        </p>

        <form action="/book/quote" className="mt-6 space-y-5">
          <SliderField name="bedrooms" label="Bedrooms" min={0} max={6} defaultValue={bedrooms} />
          <SliderField name="bathrooms" label="Bathrooms" min={1} max={5} defaultValue={bathrooms} />
          <SliderField name="sqft" label="Square feet" min={300} max={4000} step={50} defaultValue={sqft} />
          <button
            type="submit"
            className="rounded-lg border border-white/10 bg-white/[0.04] text-gray-100 px-4 py-2 text-sm font-medium hover:bg-white/[0.08]"
          >
            Recalculate
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-card p-8">
        <div className="text-sm font-medium uppercase tracking-wider text-accent-400">
          Your quote
        </div>
        <div className="mt-2 text-5xl font-semibold">${(cents / 100).toFixed(0)}</div>
        <div className="mt-2 text-sm text-gray-500">
          {bedrooms} BR · {bathrooms} BA · {sqft} sqft. Pay 50% now, 50% on
          completion.
        </div>

        <Link
          href={{
            pathname: "/book/checkout",
            query: { bedrooms, bathrooms, sqft, price: cents },
          }}
          className="mt-6 block w-full rounded-lg bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:from-accent-400 hover:to-accent-600"
        >
          Continue to checkout →
        </Link>

        <p className="mt-4 text-xs text-gray-500">
          Pricing is illustrative. Final price may adjust based on actual
          condition + add-ons (windows, fridge interior, etc.).
        </p>
      </div>
    </div>
  );
}

function SliderField({
  name,
  label,
  min,
  max,
  step = 1,
  defaultValue,
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="font-mono text-accent-400">{defaultValue}</span>
      </div>
      <input
        name={name}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        className="mt-1 w-full accent-brand-600"
      />
    </label>
  );
}
