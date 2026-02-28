import { useMemo, type FC } from 'react';

export type Cartridge = {
  id: string;
  name: string;
  hex: string;
};

const foundationCartridges: Cartridge[] = [
  { id: 'F1', name: 'Porcelain Base', hex: '#F2D6C9' },
  { id: 'F2', name: 'Ivory Base', hex: '#E6BFAE' },
  { id: 'F3', name: 'Warm Beige', hex: '#D7B08F' },
  { id: 'F4', name: 'Honey Beige', hex: '#C89B78' },
  { id: 'F5', name: 'Caramel', hex: '#B88763' },
  { id: 'F6', name: 'Tan Blend', hex: '#9C6B52' },
  { id: 'F7', name: 'Mocha Blend', hex: '#7C5C3E' },
  { id: 'F8', name: 'Deep Neutral', hex: '#5B3A29' },
];

const lipstickCartridges: Cartridge[] = [
  { id: 'L1', name: 'Rose Nude', hex: '#D2A679' },
  { id: 'L2', name: 'Dusty Pink', hex: '#B76E79' },
  { id: 'L3', name: 'Coral Pop', hex: '#FF7F50' },
  { id: 'L4', name: 'Classic Red', hex: '#C72C48' },
  { id: 'L5', name: 'Berry Plum', hex: '#7B294E' },
  { id: 'L6', name: 'Fuchsia Boost', hex: '#E43F6F' },
  { id: 'L7', name: 'Brick Tone', hex: '#8B3A3A' },
  { id: 'L8', name: 'Deep Wine', hex: '#4B244A' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function normalizePercentages(rawValues: number[]): number[] {
  const total = rawValues.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return rawValues.map(() => 0);
  const scaled = rawValues.map((value) => Math.round((value / total) * 100));
  const delta = 100 - scaled.reduce((sum, value) => sum + value, 0);
  if (delta !== 0 && scaled.length > 0) {
    scaled[0] += delta;
  }
  return scaled;
}

export type ProposedShade = {
  name: string;
  hex: string;
};

export type MixBreakdownItem = {
  cartridgeId: string;
  percentage: number;
};

export interface CartridgeMarqueeProps {
  targetHex: string;
  title?: string;
  mode?: 'foundation' | 'lipstick';
  cartridges?: Cartridge[];
  proposedShades?: ProposedShade[];
  selectedShadeName?: string;
  highlightCartridgeIds?: string[];
  mixBreakdown?: MixBreakdownItem[];
  onShadeSelect?: (shade: ProposedShade) => void;
  scrollDurationSeconds?: number;
}

const CartridgeMarquee: FC<CartridgeMarqueeProps> = ({
  targetHex,
  title = 'Cartridge match',
  mode = 'foundation',
  cartridges,
  proposedShades,
  selectedShadeName,
  highlightCartridgeIds,
  mixBreakdown,
  onShadeSelect,
  scrollDurationSeconds = 30,
}) => {
  const activeCartridges = useMemo(() => {
    if (cartridges && cartridges.length > 0) return cartridges;
    return mode === 'lipstick' ? lipstickCartridges : foundationCartridges;
  }, [cartridges, mode]);

  const topMix = useMemo(() => {
    const t = hexToRgb(targetHex);
    if (!t) return [] as Array<{ cartridge: Cartridge; distance: number; weight: number; percentage: number }>;

    const ranked = activeCartridges
      .map((c) => {
        const rgb = hexToRgb(c.hex);
        return {
          cartridge: c,
          distance: rgb ? colorDistance(t, rgb) : Number.POSITIVE_INFINITY,
        };
      })
      .sort((x, y) => x.distance - y.distance)
      .slice(0, 3);

    const epsilon = 1;
    const rawWeights = ranked.map((entry) => 1 / (entry.distance + epsilon));
    const percentages = normalizePercentages(rawWeights);

    return ranked.map((entry, index) => ({
      cartridge: entry.cartridge,
      distance: entry.distance,
      weight: rawWeights[index],
      percentage: percentages[index],
    }));
  }, [activeCartridges, targetHex]);

  const highlightedIds = useMemo(() => {
    if (highlightCartridgeIds && highlightCartridgeIds.length > 0) {
      return new Set(highlightCartridgeIds);
    }
    return new Set(topMix.map((entry) => entry.cartridge.id));
  }, [highlightCartridgeIds, topMix]);

  const displayedShades = useMemo(() => {
    if (!proposedShades || proposedShades.length === 0) return [] as ProposedShade[];
    return proposedShades;
  }, [proposedShades]);

  const displayedMix = useMemo(() => {
    if (mixBreakdown && mixBreakdown.length > 0) {
      return mixBreakdown;
    }
    return topMix.map((entry) => ({
      cartridgeId: entry.cartridge.id,
      percentage: entry.percentage,
    }));
  }, [mixBreakdown, topMix]);

  const cartridgeNameMap = useMemo(
    () => new Map(activeCartridges.map((cartridge) => [cartridge.id, cartridge.name])),
    [activeCartridges],
  );

  const items = useMemo(() => {
    // duplicate for a seamless marquee loop
    return [...activeCartridges, ...activeCartridges];
  }, [activeCartridges]);

  return (
    <div className="mt-4 w-full max-w-md mx-auto">
      <div className="lux-card rounded-xl px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 sm:gap-4">
          <div className="font-bold text-sm text-[#6d4c1e] break-words">{title}</div>
          <div className="text-xs text-[#6d4c1e]/70">3-cartridge mix</div>
        </div>

        {displayedShades.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayedShades.map((shade) => (
              <button
                key={`${shade.name}-${shade.hex}`}
                type="button"
                onClick={() => onShadeSelect?.(shade)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition ${
                  selectedShadeName === shade.name
                    ? 'border-[#bfa77a] bg-[#1c1a17] text-[#f7f2ea]'
                    : 'border-[#d4af37] bg-white/80 text-[#6d4c1e] hover:bg-white'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-[#bfa77a]/70"
                  style={{ backgroundColor: shade.hex }}
                />
                {shade.name}
              </button>
            ))}
          </div>
        )}

        {displayedMix.length === 3 && (
          <div className="mt-3 text-xs text-[#6d4c1e] leading-relaxed break-words">
            <span className="font-semibold">Mix for shade {selectedShadeName || targetHex}: </span>
            {displayedMix.map((entry, index) => (
              <span key={entry.cartridgeId} className="inline">
                {(cartridgeNameMap.get(entry.cartridgeId) || entry.cartridgeId)} {entry.percentage}%
                {index < displayedMix.length - 1 ? ' + ' : ''}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 cartridge-marquee">
          <div className="cartridge-track" style={{ animationDuration: `${scrollDurationSeconds}s` }}>
            {items.map((c, idx) => {
              const active = highlightedIds.has(c.id);
              return (
                <div
                  // idx is needed since ids repeat in the duplicated list
                  key={`${c.id}-${idx}`}
                  className={
                    'cartridge-item ' +
                    (active ? 'cartridge-item--active' : 'cartridge-item--inactive')
                  }
                  aria-hidden={idx >= activeCartridges.length}
                >
                  <div className="cartridge-shell">
                    <div className="cartridge-fill" style={{ background: c.hex }} />
                    <div className="cartridge-shine" />
                  </div>
                  <div className="cartridge-label">{c.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartridgeMarquee;
