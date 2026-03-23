import { useRef, useEffect, useMemo, useState, type FC } from "react";
import { apiFetch, parseApiError } from "../config/api";
import CartridgeMarquee, { type Cartridge } from './CartridgeMarquee';
import skinSignatureDeviceImage from '../assets/SkinSignature.png';

// Add hex to Lipstick interface
interface Lipstick {
  name: string;
  color: string; // e.g. "rgb(255,0,0)"
  hex: string;
}

type SkinToneProfile = 'fair' | 'medium' | 'deep';

type ShadeMix = {
  cartridgeId: string;
  percentage: number;
};

type MixedLipstick = Lipstick & {
  mix: ShadeMix[];
};

type LipstickCartridgeSet = {
  id: 'set-a' | 'set-b';
  label: string;
  cartridges: Cartridge[];
};

const DEVICE_CART_STORAGE_KEY = 'ss-device-in-cart';

const storeLipstickCartridges: Cartridge[] = [
  { id: 'L1', name: 'Rose Nude', hex: '#D2A679' },
  { id: 'L2', name: 'Dusty Pink', hex: '#B76E79' },
  { id: 'L3', name: 'Coral Pop', hex: '#FF7F50' },
  { id: 'L4', name: 'Classic Red', hex: '#C72C48' },
  { id: 'L5', name: 'Berry Plum', hex: '#7B294E' },
  { id: 'L6', name: 'Fuchsia Boost', hex: '#E43F6F' },
  { id: 'L7', name: 'Brick Tone', hex: '#8B3A3A' },
  { id: 'L8', name: 'Deep Wine', hex: '#4B244A' },
];

const inhouseLipstickSets: LipstickCartridgeSet[] = [
  {
    id: 'set-a',
    label: 'Nude Rose Blend',
    cartridges: [
      { id: 'LA', name: 'Nude Base', hex: '#D2A679' },
      { id: 'LB', name: 'Rose Core', hex: '#C48793' },
      { id: 'LC', name: 'Deep Plum', hex: '#7B294E' },
    ],
  },
  {
    id: 'set-b',
    label: 'Coral Red Blend',
    cartridges: [
      { id: 'LD', name: 'Coral Base', hex: '#FF7F50' },
      { id: 'LE', name: 'True Red', hex: '#C72C48' },
      { id: 'LF', name: 'Brick Depth', hex: '#8B3A3A' },
    ],
  },
];

const inhouseLipstickRatios = [
  [66, 24, 10],
  [56, 28, 16],
  [46, 32, 22],
  [36, 34, 30],
  [26, 34, 40],
  [16, 32, 52],
];

function normalizeShadeName(name: string): string {
  return String(name || '')
    .replace(/^\s*(LV|DIOR|MAC|NARS|YSL|CHANEL|GUCCI|FENTY|ARMANI|ESTEE\s+LAUDER)[\s-]+/i, '')
    .trim();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorDistance(left: { r: number; g: number; b: number }, right: { r: number; g: number; b: number }): number {
  const dr = left.r - right.r;
  const dg = left.g - right.g;
  const db = left.b - right.b;
  return dr * dr + dg * dg + db * db;
}

function normalizePercentages(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const scaled = values.map((value) => Math.round((value / total) * 100));
  const delta = 100 - scaled.reduce((sum, value) => sum + value, 0);
  if (scaled.length > 0) scaled[0] += delta;
  return scaled;
}

function inferMixFromShade(shadeHex: string, cartridges: Cartridge[]): ShadeMix[] {
  const target = hexToRgb(shadeHex);
  const top = cartridges
    .map((cartridge) => ({ cartridge, distance: colorDistance(target, hexToRgb(cartridge.hex)) }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 3);
  const raw = top.map((entry) => 1 / (entry.distance + 1));
  const percentages = normalizePercentages(raw);
  return top.map((entry, index) => ({ cartridgeId: entry.cartridge.id, percentage: percentages[index] }));
}

function toneLuma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function normalizeSkinTone(value?: string): SkinToneProfile {
  if (!value) return 'medium';
  const v = value.toLowerCase();
  if (v.includes('fair') || v.includes('light') || v.includes('ivory') || v.includes('porcelain')) return 'fair';
  if (v.includes('deep') || v.includes('dark') || v.includes('rich') || v.includes('ebony')) return 'deep';
  return 'medium';
}

function adaptLipsticksForSkinTone(shades: Lipstick[], skintone: SkinToneProfile): Lipstick[] {
  const target = skintone === 'fair' ? 155 : skintone === 'deep' ? 105 : 128;
  return [...shades].sort((left, right) => {
    const leftDelta = Math.abs(toneLuma(left.hex) - target);
    const rightDelta = Math.abs(toneLuma(right.hex) - target);
    return leftDelta - rightDelta;
  });
}

function scoreDescriptor(score: number): string {
  if (score >= 92) return 'Exceptional Match';
  if (score >= 84) return 'Refined Match';
  if (score >= 74) return 'Elevated Match';
  if (score >= 64) return 'Harmonized Match';
  return 'Developing Match';
}

function scoreStory(score: number): { label: string; subtle: string } {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return {
    label: scoreDescriptor(normalized),
    subtle: `(${normalized}%)`,
  };
}

function mixHexFromRatios(cartridges: Cartridge[], ratios: number[]): string {
  let r = 0;
  let g = 0;
  let b = 0;
  cartridges.forEach((cartridge, index) => {
    const rgb = hexToRgb(cartridge.hex);
    const p = (ratios[index] || 0) / 100;
    r += rgb.r * p;
    g += rgb.g * p;
    b += rgb.b * p;
  });
  const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const occasionOptions = [
  { value: 'casual', label: 'Casual' },
  { value: 'party', label: 'Party' },
  { value: 'office', label: 'Office' },
];

type LipstickBackendAnalysis = {
  confidence?: number;
  lip_detected?: boolean;
  lip_info?: {
    lip_type?: string;
  };
};

function deriveLipstickProposals(
  shades: MixedLipstick[],
  analysis: LipstickBackendAnalysis,
  skintone: SkinToneProfile,
  occasion: string,
  finish: 'matte' | 'glossy',
): MixedLipstick[] {
  if (shades.length === 0) return [];

  const occasionOffset: Record<string, number> = {
    casual: -7,
    office: -3,
    party: -12,
    wedding: 8,
    festival: -4,
    editorial: -12,
  };

  const baseTarget = skintone === 'fair' ? 155 : skintone === 'deep' ? 105 : 128;
  const finishOffset = finish === 'glossy' ? 4 : -2;
  const lipType = String(analysis.lip_info?.lip_type || '').toLowerCase();
  const lipTypeOffset = lipType.includes('thin') ? -3 : 2;
  const confidence = Math.max(0, Math.min(100, Number(analysis.confidence || 0)));
  const confidenceOffset = confidence >= 90 ? 0 : confidence >= 75 ? 2 : 5;
  const targetLuma = baseTarget + (occasionOffset[occasion] ?? 0) + finishOffset + lipTypeOffset + confidenceOffset;
  const redTokens = ['red', 'rouge', 'scarlet', 'crimson', 'cherry', 'ruby'];
  const isOffice = occasion === 'office';

  return [...shades]
    .sort((left, right) => {
      const leftLuma = toneLuma(left.hex);
      const rightLuma = toneLuma(right.hex);
      const leftIsRed = redTokens.some((token) => left.name.toLowerCase().includes(token));
      const rightIsRed = redTokens.some((token) => right.name.toLowerCase().includes(token));

      let leftScore = Math.abs(leftLuma - targetLuma);
      let rightScore = Math.abs(rightLuma - targetLuma);

      if (isOffice) {
        if (leftLuma > 148) leftScore += 8;
        if (rightLuma > 148) rightScore += 8;
      } else {
        if (leftLuma > 138) leftScore += 8;
        if (rightLuma > 138) rightScore += 8;
        if (leftIsRed) leftScore -= 7;
        if (rightIsRed) rightScore -= 7;
      }

      return leftScore - rightScore;
    })
    .slice(0, Math.min(6, shades.length));
}

type RegionKey = 'global' | 'americas' | 'emea' | 'apac';

const regionDisplayLabel: Record<RegionKey, string> = {
  global: 'Global',
  americas: 'Americas',
  emea: 'EMEA',
  apac: 'APAC',
};

function detectRegionFromLocale(): RegionKey {
  if (typeof navigator === 'undefined') return 'global';

  const locales = Array.from(
    new Set([
      navigator.language,
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    ].filter(Boolean).map((value) => String(value).toLowerCase())),
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.toLowerCase() || '';
  if (timezone.startsWith('asia/') || timezone.startsWith('australia/')) return 'apac';
  if (timezone.startsWith('america/')) return 'americas';
  if (timezone.startsWith('europe/') || timezone.startsWith('africa/')) return 'emea';

  const getCountryCode = (locale: string): string => {
    const parts = locale.split(/[-_]/).map((part) => part.toLowerCase());
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (parts[index].length === 2) return parts[index];
    }
    return '';
  };

  const countries = new Set(locales.map(getCountryCode).filter(Boolean));
  const hasCountry = (codes: string[]) => codes.some((code) => countries.has(code));

  if (hasCountry(['in', 'cn', 'jp', 'kr', 'th', 'vi', 'sg', 'hk', 'my', 'id', 'ph', 'au', 'nz', 'tw'])) return 'apac';
  if (hasCountry(['us', 'ca', 'mx', 'br', 'ar', 'cl', 'co', 'pe'])) return 'americas';
  if (hasCountry(['gb', 'fr', 'de', 'it', 'es', 'pt', 'nl', 'be', 'ch', 'se', 'no', 'dk', 'fi', 'ie', 'ae', 'sa', 'qa', 'kw', 'om', 'za', 'eg', 'tr'])) return 'emea';

  if (locales.some((locale) => locale.startsWith('zh-') || locale.startsWith('ja-') || locale.startsWith('ko-') || locale.startsWith('th-') || locale.startsWith('vi-') || locale.startsWith('hi-') || locale.startsWith('bn-') || locale.startsWith('ta-') || locale.startsWith('te-') || locale.startsWith('ml-') || locale.startsWith('mr-') || locale.startsWith('gu-') || locale.startsWith('kn-') || locale.startsWith('en-in'))) return 'apac';
  if (locales.some((locale) => locale.startsWith('en-us') || locale.startsWith('en-ca') || locale.startsWith('es-mx') || locale.startsWith('pt-br'))) return 'americas';
  if (locales.some((locale) => locale.startsWith('en-gb') || locale.startsWith('fr-') || locale.startsWith('de-') || locale.startsWith('it-') || locale.startsWith('es-') || locale.startsWith('ar-'))) return 'emea';

  return 'global';
}

const commonLuxuryLipstickByOccasion: Record<RegionKey, Record<string, string[]>> = {
  global: {
    casual: ['Rouge Allure', 'Scarlet Kiss', 'Midnight Plum', 'Terracotta Brick'],
    party: ['Scarlet Kiss', 'Midnight Plum', 'Wild Fuchsia', 'Terracotta Brick'],
    office: ['Soft Beige', 'Warm Sand', 'Dusty Rosewood', 'Rich Aubergine'],
  },
  americas: {
    casual: ['Rouge Allure', 'Scarlet Kiss', 'Midnight Plum', 'Terracotta Brick'],
    party: ['Scarlet Kiss', 'Wild Fuchsia', 'Midnight Plum', 'Terracotta Brick'],
    office: ['Soft Beige', 'Warm Sand', 'Dusty Rosewood', 'Rich Aubergine'],
  },
  emea: {
    casual: ['Rouge Allure', 'Scarlet Kiss', 'Midnight Plum', 'Terracotta Brick'],
    party: ['Scarlet Kiss', 'Midnight Plum', 'Terracotta Brick', 'Wild Fuchsia'],
    office: ['Soft Beige', 'Warm Sand', 'Dusty Rosewood', 'Rich Aubergine'],
  },
  apac: {
    casual: ['Rouge Allure', 'Scarlet Kiss', 'Midnight Plum', 'Deep Amethyst'],
    party: ['Scarlet Kiss', 'Midnight Plum', 'Wild Fuchsia', 'Terracotta Brick'],
    office: ['Soft Beige', 'Warm Sand', 'Dusty Rosewood', 'Rich Aubergine'],
  },
};

function limitCommonLuxuryLipstickShades(
  shades: MixedLipstick[],
  occasion: string,
  region: RegionKey,
  shouldLimit: boolean,
): MixedLipstick[] {
  let baseList = shades;

  if (shouldLimit) {
    const preferredNames =
      commonLuxuryLipstickByOccasion[region]?.[occasion] ||
      commonLuxuryLipstickByOccasion.global[occasion] ||
      commonLuxuryLipstickByOccasion.global.casual;
    const shadeByName = new Map(shades.map((shade) => [shade.name.toLowerCase(), shade]));
    const curated = preferredNames
      .map((name) => shadeByName.get(name.toLowerCase()))
      .filter((shade): shade is MixedLipstick => !!shade);

    const curatedNames = new Set(curated.map((shade) => shade.name.toLowerCase()));
    const fallback = shades.filter((shade) => !curatedNames.has(shade.name.toLowerCase()));
    baseList = [...curated, ...fallback].slice(0, Math.min(4, shades.length));
  }

  if (occasion !== 'office') return baseList;

  const lighterThreshold = 142;
  const lighter = baseList.filter((shade) => toneLuma(shade.hex) >= lighterThreshold);
  const darker = baseList.filter((shade) => toneLuma(shade.hex) < lighterThreshold);

  const firstDark = darker[0] ? [darker[0]] : [];
  const oneLighter = lighter[0] ? [lighter[0]] : [];
  const remaining = [...darker.slice(1), ...lighter.slice(1)];
  const rebalanced = [...firstDark, ...oneLighter, ...remaining];
  return rebalanced.slice(0, Math.min(4, rebalanced.length));
}

function pickDefaultLipstickByOccasion(shades: MixedLipstick[]): MixedLipstick | undefined {
  if (shades.length === 0) return undefined;

  const redTokens = ['red', 'rouge', 'scarlet', 'crimson', 'cherry', 'ruby'];
  const isRedBased = (shade: MixedLipstick) => redTokens.some((token) => shade.name.toLowerCase().includes(token));

  const redCandidates = shades.filter(isRedBased);
  if (redCandidates.length > 0) {
    return [...redCandidates].sort((left, right) => toneLuma(left.hex) - toneLuma(right.hex))[0];
  }

  return [...shades].sort((left, right) => toneLuma(left.hex) - toneLuma(right.hex))[0];
}

function applyIntensityToPercentage(basePercentage: number, opacity: number): number {
  const normalizedOpacity = Math.max(0, Math.min(100, opacity));
  return Math.max(0, Math.round((basePercentage * normalizedOpacity) / 100));
}

function pickDominantDarkRedIndex(mix: ShadeMix[], cartridgeHexMap?: Map<string, string>): number {
  if (mix.length === 0) return 0;

  let dominantIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  mix.forEach((mixItem, index) => {
    const cartridgeHex = cartridgeHexMap?.get(mixItem.cartridgeId);
    if (!cartridgeHex) {
      if (mixItem.percentage > bestScore) {
        bestScore = mixItem.percentage;
        dominantIndex = index;
      }
      return;
    }

    const rgb = hexToRgb(cartridgeHex);
    const redLead = Math.max(0, rgb.r - (rgb.g + rgb.b) / 2);
    const luma = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    const darkness = 255 - luma;
    const score = redLead * 0.7 + darkness * 0.3;

    if (score > bestScore) {
      bestScore = score;
      dominantIndex = index;
    }
  });

  return dominantIndex;
}

function applyIntensityToMix(mix: ShadeMix[], opacity: number, cartridgeHexMap?: Map<string, string>): ShadeMix[] {
  if (mix.length === 0) return [];
  const normalizedOpacity = Math.max(0, Math.min(100, opacity));
  if (normalizedOpacity === 0) {
    return mix.map((mixItem) => ({
      cartridgeId: mixItem.cartridgeId,
      percentage: 0,
    }));
  }

  const scaled = mix.map((mixItem) => applyIntensityToPercentage(mixItem.percentage, normalizedOpacity));
  const dominantIndex = pickDominantDarkRedIndex(mix, cartridgeHexMap);
  const intensityShift = Math.max(-1, Math.min(1, (normalizedOpacity - 70) / 30));

  const adjusted = scaled.map((value, index) => {
    const factor = index === dominantIndex
      ? 1 + intensityShift * 0.35
      : 1 - intensityShift * 0.18;
    return Math.max(0, Math.round(value * factor));
  });

  const normalized = normalizePercentages(adjusted);

  return mix.map((mixItem, index) => ({
    cartridgeId: mixItem.cartridgeId,
    percentage: normalized[index],
  }));
}

// General palettes (used by store experience or as fallback)
const colorPalettes: Record<string, Lipstick[]> = {
  casual: [
    { name: 'Classic Red', hex: '#dc143c', color: 'rgb(220,20,60)' },
    { name: 'Coral', hex: '#ff7f50', color: 'rgb(255,127,80)' },
    { name: 'Peach', hex: '#ffcc99', color: 'rgb(255,204,153)' },
    { name: 'Berry', hex: '#800080', color: 'rgb(128,0,128)' },
    { name: 'Mauve', hex: '#e0b0ff', color: 'rgb(224,176,255)' },
    { name: 'Dusty Rose', hex: '#d6a5c9', color: 'rgb(214,165,201)' },
  ],
  party: [
    { name: 'Crimson Allure', hex: '#c8102e', color: 'rgb(200,16,46)' },
    { name: 'Gold Red', hex: '#a50000', color: 'rgb(165,0,0)' },
    { name: 'Rouge 999', hex: '#c72c41', color: 'rgb(199,44,65)' },
    { name: 'Pirate Rouge', hex: '#c8102e', color: 'rgb(200,16,46)' },
    { name: 'Le Rouge', hex: '#e03c31', color: 'rgb(224,60,49)' },
  ],
  office: [
    { name: 'Sand Veil', hex: '#d6b48c', color: 'rgb(214,180,140)' },
    { name: 'Pensive Plum', hex: '#7a4b8a', color: 'rgb(122,75,138)' },
    { name: 'Beige Tribute', hex: '#d6b48c', color: 'rgb(214,180,140)' },
    { name: 'Rosewood Veil', hex: '#c08081', color: 'rgb(192,128,129)' },
    { name: 'Urban Cocoa', hex: '#8b5b29', color: 'rgb(139,91,41)' },
  ],
};


const luxurySuggestions: Record<string, Record<string, string[]>> = {
  fair: {
    casual: ['LV Nude Lavalliere', 'LV Urban Beige', 'LV Rose Adrienne'],
    party: ['LV Cherry Lush', 'LV Goldie Red', 'LV Rouge 999'],
    office: ['LV Sand Veil', 'LV Pensive Plum', 'LV Beige Tribute'],
  },
  medium: {
    casual: ['LV Be Dior', 'LV Corail Shine', 'LV Blaze of Noon'],
    party: ['LV Scarlet Rouge', 'LV Pirate Rouge', 'LV Red Smile'],
    office: ['LV Sultan Rose', 'LV Rose Stiletto', 'LV Mildred Rosewood'],
  },
  deep: {
    casual: ['LV Argentina Rose', 'LV Jean Cocoa', 'LV Black Tie'],
    party: ['LV Velvet Cherry', 'LV Le Rouge', 'LV Ambitious Rouge'],
    office: ['LV Drama Matte', 'LV Janet Rust', 'LV Rouge Noir'],
  },
};

// Expanded lipstick shades for all events and popular colors
// const lipstickShades = [
//   { name: "Classic Red", hex: "#C72C48" },
//   { name: "Ruby Woo", hex: "#B80028" },
//   { name: "Nude Beige", hex: "#D2A679" },
//   { name: "Peachy Coral", hex: "#FF8C69" },
//   { name: "Soft Pink", hex: "#F7B2B7" },
//   { name: "Mauve Rose", hex: "#B76E79" },
//   { name: "Berry Plum", hex: "#7B294E" },
//   { name: "Wine Night", hex: "#5A1832" },
//   { name: "Deep Brown", hex: "#5B3A29" },
//   { name: "Orange Pop", hex: "#FF5B2E" },
//   { name: "Hot Fuchsia", hex: "#E43F6F" },
//   { name: "Brick Terracotta", hex: "#B55239" },
//   { name: "Dusty Rose", hex: "#C48793" },
//   { name: "Vamp Purple", hex: "#4B244A" },
//   { name: "Coral Crush", hex: "#FF6F61" },
//   { name: "Everyday Pink", hex: "#F9AFAE" },
//   { name: "Party Plum", hex: "#8B2252" },
//   { name: "Office Nude", hex: "#C8A68C" },
//   { name: "Wedding Rose", hex: "#E9A6B0" },
//   { name: "Trendy Brown", hex: "#8B5C2B" }
// ];

interface LipstickTryOnInterfaceProps {
  onClose?: () => void;
  skintone?: SkinToneProfile;
  experienceType?: 'store' | 'in-house';
  launchMode?: 'store' | 'cartridge' | 'in-house';
}


const LipstickTryOnInterface: FC<LipstickTryOnInterfaceProps> = ({ onClose, skintone = 'medium', experienceType = 'store', launchMode = 'store' }) => {
  const [selectedOccasion, setSelectedOccasion] = useState(occasionOptions[0].value);
  const recommendationRegion = useMemo<RegionKey>(() => detectRegionFromLocale(), []);
  const regionContext = useMemo(
    () => ({
      region: recommendationRegion,
      locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }),
    [recommendationRegion],
  );
  const [selectedInhouseSetId, setSelectedInhouseSetId] = useState<'set-a' | 'set-b'>('set-a');
  const [detectedSkinTone, setDetectedSkinTone] = useState<SkinToneProfile>(normalizeSkinTone(skintone));
  // OMS/store and in-house palettes (available as base sets)
  const storeLipstickPalettes: Record<string, Lipstick[]> = {
    casual: [
      { name: 'Rouge Allure', hex: '#c72c41', color: 'rgb(199,44,65)' },
      { name: 'Nude Rose', hex: '#c8a68c', color: 'rgb(200,166,140)' },
      { name: 'Velvet Plum', hex: '#7B294E', color: 'rgb(123,41,78)' },
      { name: 'Deep Amethyst', hex: '#4B244A', color: 'rgb(75,36,74)' },
    ],
    party: [
      { name: 'Scarlet Kiss', hex: '#c8102e', color: 'rgb(200,16,46)' },
      { name: 'Wild Fuchsia', hex: '#e43f6f', color: 'rgb(228,63,111)' },
      { name: 'Terracotta Brick', hex: '#8B3A3A', color: 'rgb(139,58,58)' },
      { name: 'Midnight Plum', hex: '#4B244A', color: 'rgb(75,36,74)' },
    ],
    office: [
      { name: 'Warm Sand', hex: '#d2a679', color: 'rgb(210,166,121)' },
      { name: 'Dusty Rosewood', hex: '#b76e79', color: 'rgb(183,110,121)' },
      { name: 'Soft Beige', hex: '#c8a68c', color: 'rgb(200,166,140)' },
      { name: 'Rich Aubergine', hex: '#4B244A', color: 'rgb(75,36,74)' },
    ],
  };
  const activeInhouseSet = useMemo(
    () => inhouseLipstickSets.find((set) => set.id === selectedInhouseSetId) || inhouseLipstickSets[0],
    [selectedInhouseSetId],
  );
  const effectiveSkinTone = useMemo(() => normalizeSkinTone(detectedSkinTone || skintone), [detectedSkinTone, skintone]);

  // Memoize base palettes so object identity stays stable across renders
  const basePalettes = useMemo(() => (
    experienceType === 'store' ? storeLipstickPalettes : colorPalettes
  ), [experienceType]);
  const [finish, setFinish] = useState<'matte' | 'glossy'>('matte');
  const [lightingMode, setLightingMode] = useState<'day' | 'evening'>('day');
  // Distinct palettes by finish to show visible differences
  const mattePalettes: Record<string, Lipstick[]> = {
    casual: [
      { name: 'MLBB Nude', hex: '#C9A18E', color: 'rgb(201,161,142)' },
      { name: 'Soft Rose', hex: '#B8737B', color: 'rgb(184,115,123)' },
      { name: 'Cherry Red', hex: '#C0392B', color: 'rgb(192,57,43)' },
      { name: 'Brick Red', hex: '#9E2B25', color: 'rgb(158,43,37)' },
      { name: 'Berry Matte', hex: '#7A2E52', color: 'rgb(122,46,82)' },
      { name: 'Cocoa Brown', hex: '#6B3A2E', color: 'rgb(107,58,46)' },
    ],
    party: [
      { name: 'Velvet Red', hex: '#B0002A', color: 'rgb(176,0,42)' },
      { name: 'Deep Plum', hex: '#4B1F3A', color: 'rgb(75,31,58)' },
      { name: 'Hot Fuchsia', hex: '#D81B60', color: 'rgb(216,27,96)' },
      { name: 'Oxblood', hex: '#800020', color: 'rgb(128,0,32)' },
      { name: 'Wine', hex: '#5A1832', color: 'rgb(90,24,50)' },
      { name: 'Dark Ruby', hex: '#9B1B30', color: 'rgb(155,27,48)' },
    ],
    office: [
      { name: 'Nude Beige', hex: '#D2A679', color: 'rgb(210,166,121)' },
      { name: 'Soft Rose Red', hex: '#C46A73', color: 'rgb(196,106,115)' },
      { name: 'Mauve', hex: '#9E6B84', color: 'rgb(158,107,132)' },
      { name: 'Rosewood', hex: '#8B5C5E', color: 'rgb(139,92,94)' },
      { name: 'Soft Brown', hex: '#8B5C2B', color: 'rgb(139,92,43)' },
      { name: 'Muted Coral', hex: '#E08C70', color: 'rgb(224,140,112)' },
    ],
    wedding: [
      { name: 'Bridal Nude Rose', hex: '#D9A5A0', color: 'rgb(217,165,160)' },
      { name: 'Soft Peony', hex: '#E3A4B4', color: 'rgb(227,164,180)' },
      { name: 'Classic Bridal Red', hex: '#B3192E', color: 'rgb(179,25,46)' },
      { name: 'Warm Mauve', hex: '#A56C81', color: 'rgb(165,108,129)' },
      { name: 'Nude Pink', hex: '#E7B6AD', color: 'rgb(231,182,173)' },
      { name: 'Rosewood Matte', hex: '#8B5C5E', color: 'rgb(139,92,94)' },
    ],
    festival: [
      { name: 'Bright Coral', hex: '#FF6B35', color: 'rgb(255,107,53)' },
      { name: 'Neon Fuchsia', hex: '#FF3E8B', color: 'rgb(255,62,139)' },
      { name: 'Marigold Tangerine', hex: '#FF8C42', color: 'rgb(255,140,66)' },
      { name: 'Berry Pop Matte', hex: '#9B2F58', color: 'rgb(155,47,88)' },
      { name: 'Hot Pink', hex: '#E91E63', color: 'rgb(233,30,99)' },
      { name: 'Terracotta Brick', hex: '#B55239', color: 'rgb(181,82,57)' },
    ],
    editorial: [
      { name: 'Deep Plum', hex: '#4B1F3A', color: 'rgb(75,31,58)' },
      { name: 'Black Cherry', hex: '#3A0D1E', color: 'rgb(58,13,30)' },
      { name: 'Burnt Cocoa', hex: '#4A2F2A', color: 'rgb(74,47,42)' },
      { name: 'Brick Rust', hex: '#8E3B2F', color: 'rgb(142,59,47)' },
      { name: 'Vintage Rose', hex: '#B2748C', color: 'rgb(178,116,140)' },
      { name: 'Crimson', hex: '#A0122D', color: 'rgb(160,18,45)' },
    ],
  };
  const glossyPalettes: Record<string, Lipstick[]> = {
    casual: [
      { name: 'Dark Cherry', hex: '#8B0000', color: 'rgb(139,0,0)' },
      { name: 'Crimson Gloss', hex: '#A50021', color: 'rgb(165,0,33)' },
      { name: 'Plum Lacquer', hex: '#5C1A44', color: 'rgb(92,26,68)' },
      { name: 'Garnet Shine', hex: '#85182A', color: 'rgb(133,24,42)' },
      { name: 'Deep Burgundy', hex: '#6D0F2A', color: 'rgb(109,15,42)' },
      { name: 'Oxblood Gloss', hex: '#800020', color: 'rgb(128,0,32)' },
    ],
    party: [
      { name: 'Vamp Gloss', hex: '#3A0D1E', color: 'rgb(58,13,30)' },
      { name: 'Deep Merlot', hex: '#4A0020', color: 'rgb(74,0,32)' },
      { name: 'Dark Plum Shine', hex: '#4B1F3A', color: 'rgb(75,31,58)' },
      { name: 'Midnight Cherry', hex: '#5C0A1E', color: 'rgb(92,10,30)' },
      { name: 'Black Cherry Gloss', hex: '#3D0C17', color: 'rgb(61,12,23)' },
      { name: 'Oxblood Lacquer', hex: '#800020', color: 'rgb(128,0,32)' },
    ],
    office: [
      { name: 'Dusty Rose Red', hex: '#B05070', color: 'rgb(176,80,112)' },
      { name: 'Muted Cranberry', hex: '#A0404A', color: 'rgb(160,64,74)' },
      { name: 'Soft Crimson', hex: '#C0505A', color: 'rgb(192,80,90)' },
      { name: 'Rose Berry', hex: '#9A3050', color: 'rgb(154,48,80)' },
      { name: 'Antique Rose', hex: '#B06070', color: 'rgb(176,96,112)' },
      { name: 'Blush Red', hex: '#C06070', color: 'rgb(192,96,112)' },
    ],
    wedding: [
      { name: 'Bridal Shine', hex: '#E9A6B0', color: 'rgb(233,166,176)' },
      { name: 'Petal Pink Gloss', hex: '#F5B4C1', color: 'rgb(245,180,193)' },
      { name: 'True Red Lacquer', hex: '#E03C31', color: 'rgb(224,60,49)' },
      { name: 'Rose Glow', hex: '#D9A5A0', color: 'rgb(217,165,160)' },
      { name: 'Nude Shine', hex: '#C8A68C', color: 'rgb(200,166,140)' },
      { name: 'Champagne Pink', hex: '#F8C8D0', color: 'rgb(248,200,208)' },
    ],
    festival: [
      { name: 'Electric Coral', hex: '#FF6B35', color: 'rgb(255,107,53)' },
      { name: 'Candy Fuchsia', hex: '#FF3E8B', color: 'rgb(255,62,139)' },
      { name: 'Sunset Orange', hex: '#FF7F50', color: 'rgb(255,127,80)' },
      { name: 'Berry Shine', hex: '#B35C82', color: 'rgb(179,92,130)' },
      { name: 'Ruby Gloss', hex: '#C72C48', color: 'rgb(199,44,72)' },
      { name: 'Peach Shine', hex: '#FFC2A1', color: 'rgb(255,194,161)' },
    ],
    editorial: [
      { name: 'Lacquer Plum', hex: '#5B2D42', color: 'rgb(91,45,66)' },
      { name: 'Molten Cherry', hex: '#B31237', color: 'rgb(179,18,55)' },
      { name: 'Chocolate Glaze', hex: '#5D3A2E', color: 'rgb(93,58,46)' },
      { name: 'Vamp Gloss', hex: '#3A0D1E', color: 'rgb(58,13,30)' },
      { name: 'Garnet Shine', hex: '#85182A', color: 'rgb(133,24,42)' },
      { name: 'Rose Metal', hex: '#C07A8A', color: 'rgb(192,122,138)' },
    ],
  };
  const activeCartridges = useMemo(
    () => (experienceType === 'store' ? storeLipstickCartridges : activeInhouseSet.cartridges),
    [experienceType, activeInhouseSet],
  );

  const activeLipstickShades = useMemo((): MixedLipstick[] => {
    if (experienceType === 'in-house') {
      const generated = inhouseLipstickRatios.map((ratio, index) => {
        const hex = mixHexFromRatios(activeInhouseSet.cartridges, ratio);
        const mix = activeInhouseSet.cartridges.map((cartridge, cartridgeIndex) => ({
          cartridgeId: cartridge.id,
          percentage: ratio[cartridgeIndex],
        }));
        return {
          name: `${activeInhouseSet.label} ${index < 3 ? `Light ${index + 1}` : `Deep ${index - 2}`}`,
          hex,
          color: hex,
          mix,
        };
      });
      return generated;
    }

    const source = finish === 'matte' ? mattePalettes : glossyPalettes;
    const fromPalette = source[selectedOccasion] || basePalettes[selectedOccasion] || [];
    const adapted = adaptLipsticksForSkinTone(fromPalette, effectiveSkinTone);
    return adapted.map((shade) => ({
      ...shade,
      name: normalizeShadeName(shade.name),
      mix: inferMixFromShade(shade.hex, activeCartridges),
    }));
  }, [experienceType, activeInhouseSet, finish, selectedOccasion, basePalettes, effectiveSkinTone, activeCartridges]);

  const fallbackLipstick: MixedLipstick = {
    name: 'Classic Red',
    hex: '#C72C48',
    color: '#C72C48',
    mix: inferMixFromShade('#C72C48', activeCartridges),
  };

  const [selectedLipstick, setSelectedLipstick] = useState<MixedLipstick>(activeLipstickShades[0] || fallbackLipstick);
  const [proposedLipstickShades, setProposedLipstickShades] = useState<MixedLipstick[]>([]);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [isProposalLoading, setIsProposalLoading] = useState(false);
  const [lipBackendAnalysis, setLipBackendAnalysis] = useState<LipstickBackendAnalysis | null>(null);

  useEffect(() => {
    if (!analysisReady && activeLipstickShades[0]) {
      setSelectedLipstick(activeLipstickShades[0]);
    }
  }, [activeLipstickShades, analysisReady]);
  const [lipstickOpacity, setLipstickOpacity] = useState(70);
  const [hasCapturedMonogramPortrait, setHasCapturedMonogramPortrait] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveLipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lipDetected, setLipDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [reservationMessage, setReservationMessage] = useState<string>('');
  const [reservationReference, setReservationReference] = useState<string>('');
  const [reservationLoading, setReservationLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState<string>('');
  const [cartLoadingAll, setCartLoadingAll] = useState(false);
  const [cartLoadingById, setCartLoadingById] = useState<Record<string, boolean>>({});
  const [deviceCartLoading, setDeviceCartLoading] = useState(false);
  const [deviceCartMessage, setDeviceCartMessage] = useState('');
  const [isDeviceAlreadyInCart, setIsDeviceAlreadyInCart] = useState(false);
  const [addedCartridgeIds, setAddedCartridgeIds] = useState<Record<string, boolean>>({});
  const hasAddedCartridges = useMemo(
    () => Object.values(addedCartridgeIds).some(Boolean),
    [addedCartridgeIds],
  );
  const addedCartridgeStorageKey = useMemo(
    () => `ss-added-cartridges:lipstick:${experienceType}:${launchMode}:${selectedLipstick.hex.toLowerCase()}:${finish}`,
    [experienceType, launchMode, selectedLipstick.hex, finish],
  );
  const [zoom, setZoom] = useState<number>(1);
  const [zoomTarget, setZoomTarget] = useState<number>(1);
  const rafZoomRef = useRef<number | null>(null);

  // Throttle zoom updates to the video with rAF to reduce jitter
  useEffect(() => {
    if (rafZoomRef.current !== null) {
      cancelAnimationFrame(rafZoomRef.current);
    }
    rafZoomRef.current = requestAnimationFrame(() => {
      setZoom(zoomTarget);
      rafZoomRef.current = null;
    });
    return () => {
      if (rafZoomRef.current !== null) {
        cancelAnimationFrame(rafZoomRef.current);
        rafZoomRef.current = null;
      }
    };
  }, [zoomTarget]);

  useEffect(() => {
    setDetectedSkinTone(normalizeSkinTone(skintone));
  }, [skintone]);

  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);

  // Dummy analysis data
  const getAnalysisData = () => {
    return {
      hydration: Math.round(Math.random() * 100),
      colorMatch: Math.round(Math.random() * 100),
      volume: Math.round(Math.random() * 100),
      undertone: ['Warm', 'Cool', 'Neutral'][Math.floor(Math.random() * 3)],
      moisturizing: Math.round(Math.random() * 100),
      longLasting: Math.round(Math.random() * 100),
      uvProtection: Math.round(Math.random() * 100),
    };
  };
  const currentAnalysis = getAnalysisData();
  const lipConfidenceStory = useMemo(() => scoreStory(confidence || currentAnalysis.colorMatch), [confidence, currentAnalysis.colorMatch]);
  const hydrationStory = useMemo(() => scoreStory(currentAnalysis.hydration), [currentAnalysis.hydration]);
  const colorMatchStory = useMemo(() => scoreStory(currentAnalysis.colorMatch), [currentAnalysis.colorMatch]);
  const volumeStory = useMemo(() => scoreStory(currentAnalysis.volume), [currentAnalysis.volume]);

  const cartridgeNameMap = useMemo(
    () => new Map(activeCartridges.map((cartridge) => [cartridge.id, cartridge.name])),
    [activeCartridges],
  );

  const cartridgeHexMap = useMemo(
    () => new Map(activeCartridges.map((cartridge) => [cartridge.id, cartridge.hex])),
    [activeCartridges],
  );

  const intensityAdjustedSelectedMix = useMemo(
    () => applyIntensityToMix(selectedLipstick.mix, lipstickOpacity, cartridgeHexMap),
    [selectedLipstick.mix, lipstickOpacity, cartridgeHexMap],
  );

  const replenishmentPlan = useMemo(() => {
    return [...intensityAdjustedSelectedMix]
      .sort((left, right) => right.percentage - left.percentage)
      .map((mixItem, index) => ({
        cartridgeId: mixItem.cartridgeId,
        cartridgeName: cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId,
        percentage: mixItem.percentage,
        priority: index === 0 ? 'Priority refill' : index === 1 ? 'Secondary refill' : 'Support refill',
        etaDays: index === 0 ? 16 : index === 1 ? 22 : 28,
      }));
  }, [intensityAdjustedSelectedMix, cartridgeNameMap]);

  const proposedShadeLinks = useMemo(() => {
    return proposedLipstickShades.map((shade, index) => {
      const sortedMix = applyIntensityToMix(
        [...shade.mix]
        .sort((left, right) => right.percentage - left.percentage)
        .slice(0, 3),
        lipstickOpacity,
        cartridgeHexMap,
      ).map((mixItem) => ({
        name: cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId,
        percentage: mixItem.percentage,
      }));

      const rank = index === 0 ? 'Top match' : index === 1 ? 'Strong match' : 'Alternative';
      const formulaText = sortedMix.length > 0
        ? sortedMix.map((item) => `${item.name} ${item.percentage}%`).join(' · ')
        : 'Formula details unavailable';

      return {
        hex: shade.hex,
        name: shade.name,
        rank,
        formulaText,
      };
    });
  }, [proposedLipstickShades, cartridgeNameMap, lipstickOpacity, cartridgeHexMap]);

  const expectedWearProfile = useMemo(() => {
    const baseHours = finish === 'matte' ? 8 : 6;
    const intensityBoost = lipstickOpacity >= 75 ? 1 : 0;
    const longWearBoost = currentAnalysis.longLasting >= 80 ? 1 : 0;
    const minHours = Math.max(4, baseHours - 1 + intensityBoost + longWearBoost);
    const maxHours = minHours + 2;
    return {
      longevity: `${minHours}-${maxHours}h`,
      touchUpWindow: finish === 'glossy' ? 'Touch-up every 2-3h' : 'Touch-up every 3-4h',
      bestSetting: finish === 'glossy'
        ? 'Best for evening shine and statement lighting'
        : 'Best for polished day-to-evening wear',
    };
  }, [finish, lipstickOpacity, currentAnalysis.longLasting]);

  const showProposedShadesSection = capturedImage && analysisReady && proposedLipstickShades.length > 0;

  const finishLightingProfile = useMemo(() => {
    const isEvening = lightingMode === 'evening';
    const baseAlpha = Math.max(0.1, Math.min(1, lipstickOpacity / 100));
    const finishBoost = finish === 'glossy' ? 1.2 : 0.84;
    const lightingBoost = isEvening ? 1.1 : 0.98;
    const mediaFilter = finish === 'glossy'
      ? (isEvening
          ? 'brightness(0.99) contrast(1.1) saturate(1.14)'
          : 'brightness(1.04) contrast(1.08) saturate(1.12)')
      : (isEvening
          ? 'brightness(0.93) contrast(1.02) saturate(0.97)'
          : 'brightness(0.98) contrast(1.0) saturate(0.95)');
    return {
      overlayAlpha: Math.max(0.1, Math.min(1, baseAlpha * finishBoost * lightingBoost)),
      blurPx: finish === 'glossy' ? (isEvening ? 1.65 : 1.35) : (isEvening ? 0.98 : 0.72),
      mediaFilter,
    };
  }, [lightingMode, finish, lipstickOpacity]);

  const handleReserveFormula = async () => {
    setReservationLoading(true);
    setReservationMessage('');
    setReservationReference('');
    try {
      if (experienceType === 'in-house') {
        await apiFetch('/device/dispense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'lipstick',
            selected_hex: selectedLipstick.hex,
            cartridges: intensityAdjustedSelectedMix.map((mixItem) => mixItem.cartridgeId),
            proportions: intensityAdjustedSelectedMix.map((mixItem) => mixItem.percentage),
            quantity_ml: 0.2,
            requested_intensity: lipstickOpacity,
            region_context: regionContext,
          }),
        });
        setReservationMessage(`Dispense initiated for ${selectedLipstick.name}.`);
        return;
      }

      const response = await apiFetch('/v1/reserve-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: 'lipstick',
          experience_type: experienceType,
          launch_mode: launchMode,
          shade_name: selectedLipstick.name,
          shade_hex: selectedLipstick.hex,
          finish,
          requested_intensity: lipstickOpacity,
          region_context: regionContext,
          cartridges: intensityAdjustedSelectedMix.map((mixItem) => ({
            cartridge_id: mixItem.cartridgeId,
            percentage: mixItem.percentage,
          })),
          expected_wear_profile: expectedWearProfile,
        }),
      });
      const result = await response.json() as {
        success?: boolean;
        reservation_reference?: string;
        message?: string;
      };

      if (!response.ok || !result.success || !result.reservation_reference) {
        throw new Error(result.message || 'Reservation failed');
      }

      const primary = replenishmentPlan[0];
      setReservationReference(result.reservation_reference);
      setReservationMessage(
        `Reserved ${selectedLipstick.name}. ${primary?.cartridgeName || 'Primary cartridge'} suggested in ${primary?.etaDays || 18} days.`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown checkout error';
      setReservationMessage(
        experienceType === 'in-house'
          ? `Unable to dispense the selected shade right now. (${reason})`
          : `Unable to reserve this formula right now. (${reason})`,
      );
    } finally {
      setReservationLoading(false);
    }
  };

  useEffect(() => {
    setReservationMessage('');
    setReservationReference('');
    setCartMessage('');
    setCartLoadingById({});
    setDeviceCartMessage('');
  }, [selectedLipstick.name, finish]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(addedCartridgeStorageKey);
      if (!stored) {
        setAddedCartridgeIds({});
        return;
      }
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      if (parsed && typeof parsed === 'object') {
        setAddedCartridgeIds(parsed);
      } else {
        setAddedCartridgeIds({});
      }
    } catch {
      setAddedCartridgeIds({});
    }
  }, [addedCartridgeStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(addedCartridgeStorageKey, JSON.stringify(addedCartridgeIds));
    } catch {
      // ignore storage quota/privacy errors
    }
  }, [addedCartridgeStorageKey, addedCartridgeIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncDeviceCartState = () => {
      try {
        setIsDeviceAlreadyInCart(window.localStorage.getItem(DEVICE_CART_STORAGE_KEY) === 'true');
      } catch {
        setIsDeviceAlreadyInCart(false);
      }
    };

    syncDeviceCartState();
    window.addEventListener('storage', syncDeviceCartState);
    return () => window.removeEventListener('storage', syncDeviceCartState);
  }, []);

  const handleResetAddedCartridges = () => {
    setAddedCartridgeIds({});
    setCartLoadingById({});
    setCartMessage('Added cartridge markers reset for this shade.');
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(addedCartridgeStorageKey);
    } catch {
      // ignore storage quota/privacy errors
    }
  };

  const handleAddDeviceToCart = async () => {
    setDeviceCartLoading(true);
    setDeviceCartMessage('');
    try {
      const response = await apiFetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: 'SS2025-DEVICE',
          product_name: 'Skin Signature Device',
          category: 'device',
          product_type: 'skin-device',
          launch_mode: launchMode,
          quantity: 1,
          price: 2499.0,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to add device right now.');
      }

      setIsDeviceAlreadyInCart(true);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(DEVICE_CART_STORAGE_KEY, 'true');
        } catch {
          // ignore storage quota/privacy errors
        }
      }
      setDeviceCartMessage('Skin Signature Device added to cart.');
    } catch {
      setDeviceCartMessage('Could not add device right now. Please try again.');
    } finally {
      setDeviceCartLoading(false);
    }
  };

  const addCartridgeToCart = async (cartridgeId: string, percentage: number) => {
    const cartridgeName = cartridgeNameMap.get(cartridgeId) || cartridgeId;
    setCartLoadingById((previous) => ({ ...previous, [cartridgeId]: true }));
    try {
      const response = await apiFetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: `CRT-${cartridgeId}`,
          product_name: `${cartridgeName} Cartridge`,
          category: 'cartridge',
          product_type: 'lipstick',
          shade_name: selectedLipstick.name,
          shade_hex: selectedLipstick.hex,
          cartridge_id: cartridgeId,
          cartridge_percentage: percentage,
          requested_intensity: lipstickOpacity,
          finish,
          experience_type: experienceType,
          launch_mode: launchMode,
          quantity: 1,
          price: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Cart API unavailable');
      }

      setAddedCartridgeIds((previous) => ({ ...previous, [cartridgeId]: true }));
      setCartMessage(`${cartridgeName} added to cart.`);
    } catch {
      setCartMessage(`Unable to add ${cartridgeName} right now.`);
    } finally {
      setCartLoadingById((previous) => ({ ...previous, [cartridgeId]: false }));
    }
  };

  const handleAddAllCartridgesToCart = async () => {
    const uniqueMix = Array.from(
      new Map(intensityAdjustedSelectedMix.map((mixItem) => [mixItem.cartridgeId, mixItem])).values(),
    );

    if (uniqueMix.length === 0) {
      setCartMessage('No cartridges available to add.');
      return;
    }

    setCartLoadingAll(true);
    let successCount = 0;

    for (const mixItem of uniqueMix) {
      const cartridgeName = cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId;
      try {
        const response = await apiFetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: `CRT-${mixItem.cartridgeId}`,
            product_name: `${cartridgeName} Cartridge`,
            category: 'cartridge',
            product_type: 'lipstick',
            shade_name: selectedLipstick.name,
            shade_hex: selectedLipstick.hex,
            cartridge_id: mixItem.cartridgeId,
            cartridge_percentage: mixItem.percentage,
            requested_intensity: lipstickOpacity,
            finish,
            experience_type: experienceType,
            launch_mode: launchMode,
            quantity: 1,
            price: 0,
          }),
        });

        if (response.ok) {
          successCount += 1;
        }
      } catch {
        // continue so user can still add available cartridges
      }
    }

    if (successCount === uniqueMix.length) {
      setAddedCartridgeIds((previous) => {
        const next = { ...previous };
        uniqueMix.forEach((mixItem) => {
          next[mixItem.cartridgeId] = true;
        });
        return next;
      });
      setCartMessage(`All ${successCount} cartridges added to cart.`);
    } else if (successCount > 0) {
      setCartMessage(`${successCount} of ${uniqueMix.length} cartridges added to cart.`);
    } else {
      setCartMessage('Unable to add cartridges to cart right now.');
    }

    setCartLoadingAll(false);
  };

  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
      setErrorMessage('');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => undefined);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      const reason = err instanceof Error ? err.message : 'Unknown camera error';
      setErrorMessage(`Unable to access camera. Please check permissions. (${reason})`);
    }
  };

  // Start camera on mount
  useEffect(() => {
    // Only start camera if no image is captured
    if (!capturedImage) {
      startCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, [capturedImage]); // Restart camera when capturedImage becomes null

  // Live lipstick overlay over camera using face landmarks
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    (async () => {
      if (!videoRef.current || !liveLipCanvasRef.current || capturedImage) return;
      const faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      ]);

      const run = async () => {
        if (cancelled || !videoRef.current || !liveLipCanvasRef.current) return;
        const video = videoRef.current;
        const canvas = liveLipCanvasRef.current;
        if (!video.videoWidth || !video.videoHeight) {
          timer = window.setTimeout(run, 80);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          timer = window.setTimeout(run, 80);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        const hex = selectedLipstick.color || selectedLipstick.hex;
        // Fallback oval if landmarks missing
        if (!det || !det.landmarks) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w * 0.5;
          const cy = h * 0.62;
          const rx = Math.max(16, w * 0.12);
          const ry = Math.max(8, h * 0.05);
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i <= 360; i++) {
            const rad = (i * Math.PI) / 180;
            const x = cx + rx * Math.cos(rad);
            const y = cy + ry * Math.sin(rad);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          const grad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
          grad.addColorStop(0, hex);
          grad.addColorStop(1, 'rgba(255,255,255,0.0)');
          ctx.globalAlpha = finishLightingProfile.overlayAlpha;
          ctx.fillStyle = grad;
          ctx.filter = `blur(${finishLightingProfile.blurPx}px)`;
          ctx.fill();
          ctx.filter = 'none';
          ctx.globalAlpha = 1;
          ctx.restore();
          timer = window.setTimeout(run, 80);
          return;
        }

        const lips = det.landmarks.getMouth();
        ctx.save();
        ctx.beginPath();
        lips.forEach((p: any, i: number) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.closePath();
        const grad = ctx.createLinearGradient(lips[0].x, lips[0].y, lips[8].x, lips[8].y);
        grad.addColorStop(0, hex);
        grad.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.globalAlpha = finishLightingProfile.overlayAlpha;
        ctx.fillStyle = grad;
        ctx.filter = `blur(${Math.max(0.65, finishLightingProfile.blurPx - 0.2)}px)`;
        ctx.fill();
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();

        timer = window.setTimeout(run, 80);
      };
      run();
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [selectedLipstick, lipstickOpacity, capturedImage, finishLightingProfile]);

  // Send image to backend with REAL lip detection
  // Prevent duplicate consecutive calls with same inputs
  const lastApplyKeyRef = useRef<string>('');

  const applyLipstickWithBackend = async (imageData: string, lipstickColor: string, opacity: number) => {
    // Validate image data before sending
    if (!imageData || imageData === '' || !imageData.includes('data:image')) {
      console.error('Invalid image data, skipping API call');
      return null;
    }

    const key = `${imageData.slice(0,64)}|${lipstickColor}|${opacity}|${finish}|${lightingMode}`;
    if (lastApplyKeyRef.current === key) {
      return null; // skip duplicate
    }
    lastApplyKeyRef.current = key;

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const response = await apiFetch('/v1/apply-lipstick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          lipstick_color: lipstickColor,
          opacity: Math.max(0.1, Math.min(1, (opacity / 100) * (lightingMode === 'evening' ? 1.08 : 0.98))),
          finish,
          region_context: regionContext,
        })
      });
      if (!response.ok) {
        const detail = await parseApiError(response);
        throw new Error(detail);
      }
      const result = await response.json();
      if (result.success && result.processed_image) {
        setProcessedImage(result.processed_image);
        setLipDetected(result.lip_detected);
        setConfidence(result.confidence || 0);
        return result as LipstickBackendAnalysis;
      } else {
        setErrorMessage(result.message || 'Failed to detect lips. Please try again.');
        setProcessedImage(null);
        setLipDetected(false);
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error applying lipstick:', error);
      setErrorMessage(`Failed to process image: ${message}`);
      setProcessedImage(null);
      setLipDetected(false);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture snapshot and apply lipstick
  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage('Camera not ready. Please wait a moment and try again.');
      return;
    }

    // Prepare face-api for mouth box if zoomed in
    let mouthBox: { x: number; y: number; width: number; height: number } | null = null;
    try {
      if (zoom > 1) {
        if (!modelsLoaded) {
          const faceapi = await import('face-api.js');
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          ]);
          setModelsLoaded(true);
        }
        const faceapi = await import('face-api.js');
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        if (det) {
          const lips = det.landmarks.getMouth();
          const xs = lips.map(p => p.x);
          const ys = lips.map(p => p.y);
          const minX = Math.max(0, Math.min(...xs));
          const minY = Math.max(0, Math.min(...ys));
          const maxX = Math.min(video.videoWidth, Math.max(...xs));
          const maxY = Math.min(video.videoHeight, Math.max(...ys));
          const pad = 0.6; // add padding around lips
          const w = (maxX - minX);
          const h = (maxY - minY);
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const halfW = (w * (1 + pad)) / 2;
          const halfH = (h * (1 + pad)) / 2;
          mouthBox = {
            x: Math.max(0, cx - halfW),
            y: Math.max(0, cy - halfH),
            width: Math.min(video.videoWidth, cx + halfW) - Math.max(0, cx - halfW),
            height: Math.min(video.videoHeight, cy + halfH) - Math.max(0, cy - halfH),
          };
        }
      }
    } catch (e) {
      // Fallback gracefully if detection fails
      mouthBox = null;
    }

    // Compute source rect for drawImage based on zoom and mouthBox
    const z = Math.max(1, Math.min(zoom, 3));
    const srcW = video.videoWidth / z;
    const srcH = video.videoHeight / z;
    let sx = (video.videoWidth - srcW) / 2;
    let sy = (video.videoHeight - srcH) / 2;
    if (mouthBox) {
      const mx = mouthBox.x + mouthBox.width / 2 - srcW / 2;
      const my = mouthBox.y + mouthBox.height / 2 - srcH / 2;
      sx = Math.max(0, Math.min(mx, video.videoWidth - srcW));
      sy = Math.max(0, Math.min(my, video.videoHeight - srcH));
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, srcW, srcH, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

    if (!imageData || imageData === 'data:,') {
      setErrorMessage('Failed to capture image. Please try again.');
      return;
    }

    setHasCapturedMonogramPortrait(true);
    setCapturedImage(imageData);
    setErrorMessage('');
    setAnalysisReady(false);
    setIsProposalLoading(true);

    const backendAnalysis = await applyLipstickWithBackend(imageData, selectedLipstick.hex, lipstickOpacity);
    if (!backendAnalysis || backendAnalysis.lip_detected === false) {
      setProposedLipstickShades([]);
      setAnalysisReady(false);
      setIsProposalLoading(false);
      return;
    }

    setLipBackendAnalysis(backendAnalysis);
    const occasionProposals = deriveLipstickProposals(
      activeLipstickShades,
      backendAnalysis,
      effectiveSkinTone,
      selectedOccasion,
      finish,
    );
    const limitedOccasionProposals = limitCommonLuxuryLipstickShades(
      occasionProposals,
      selectedOccasion,
      recommendationRegion,
      experienceType === 'store' || launchMode === 'cartridge',
    );
    setProposedLipstickShades(limitedOccasionProposals);
    const occasionDefaultLipstick = pickDefaultLipstickByOccasion(limitedOccasionProposals);
    if (occasionDefaultLipstick) {
      setSelectedLipstick(occasionDefaultLipstick);
    }
    setAnalysisReady(limitedOccasionProposals.length > 0);
    setIsProposalLoading(false);
  };

  // Retake photo - properly reset all states
  const handleRetake = () => {
    const defaultOccasion = occasionOptions[0].value;
    const defaultFinish: 'matte' | 'glossy' = 'matte';
    const defaultLipstick = activeLipstickShades[0] || selectedLipstick;

    setCapturedImage(null);
    setHasCapturedMonogramPortrait(false);
    setProcessedImage(null);
    setLipDetected(false);
    setErrorMessage('');
    setConfidence(0);
    setIsProcessing(false);
    setSelectedOccasion(defaultOccasion);
    setFinish(defaultFinish);
    setLightingMode('day');
    setSelectedLipstick(defaultLipstick);
    setLipstickOpacity(70);
    setZoomTarget(1);
    setZoom(1);
    setProposedLipstickShades([]);
    setAnalysisReady(false);
    setIsProposalLoading(false);
    setLipBackendAnalysis(null);
    startCamera();
  };

  // Update when lipstick or opacity changes (only if image is captured)
  useEffect(() => {
    if (capturedImage && lipDetected && capturedImage.includes('data:image')) {
      applyLipstickWithBackend(capturedImage, selectedLipstick.hex, lipstickOpacity);
    }
  }, [selectedLipstick, lipstickOpacity, lightingMode]);

  const handleLipstickSelect = async (lipstick: MixedLipstick) => {
    setSelectedLipstick(lipstick);
    // If in-house, send command to device to dispense blend from cartridges
    if (experienceType === 'in-house') {
      try {
        const intensityAdjustedMix = applyIntensityToMix(lipstick.mix, lipstickOpacity, cartridgeHexMap);
        await apiFetch('/device/dispense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'lipstick',
            selected_hex: lipstick.hex,
            cartridges: intensityAdjustedMix.map((mixItem) => mixItem.cartridgeId),
            proportions: intensityAdjustedMix.map((mixItem) => mixItem.percentage),
            quantity_ml: 0.2, // example quantity
            requested_intensity: lipstickOpacity,
            region_context: regionContext,
          }),
        });
      } catch {
        // Non-blocking: UI continues even if device call fails
        console.warn('Device dispense call failed (simulated).');
      }
    }
  };

  // Keep current selection when valid; only fallback when palette actually changes
  useEffect(() => {
    const first = activeLipstickShades[0];
    if (!first) return;

    setSelectedLipstick((current) => {
      const stillAvailable = activeLipstickShades.some((shade) => shade.hex === current.hex);
      return stillAvailable ? current : first;
    });
  }, [activeLipstickShades]);

  const handleClose = () => {
    setHasCapturedMonogramPortrait(false);
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach(track => track.stop());
    }
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!capturedImage || !analysisReady || !lipBackendAnalysis) return;
    const occasionProposals = deriveLipstickProposals(
      activeLipstickShades,
      lipBackendAnalysis,
      effectiveSkinTone,
      selectedOccasion,
      finish,
    );
    const limitedOccasionProposals = limitCommonLuxuryLipstickShades(
      occasionProposals,
      selectedOccasion,
      recommendationRegion,
      experienceType === 'store' || launchMode === 'cartridge',
    );
    setProposedLipstickShades(limitedOccasionProposals);
    setSelectedLipstick((current) => {
      const occasionDefaultLipstick = pickDefaultLipstickByOccasion(limitedOccasionProposals);
      if (occasionDefaultLipstick) return occasionDefaultLipstick;
      const stillPresent = limitedOccasionProposals.find((shade) => shade.hex === current.hex);
      return stillPresent || limitedOccasionProposals[0] || current;
    });
  }, [selectedOccasion, finish, capturedImage, analysisReady, lipBackendAnalysis, activeLipstickShades, effectiveSkinTone, experienceType, launchMode, recommendationRegion]);

  const isCartridgeSelectionMode = launchMode === 'cartridge';

  return (
    <div className="fixed inset-0 z-50 lux-page overflow-y-auto px-4 sm:px-6 py-6">
      <div
        className="relative w-full max-w-6xl mx-auto my-6 rounded-3xl lux-card p-4 sm:p-6 md:p-10 flex flex-col lg:flex-row gap-8 min-h-0"
        style={{ fontFamily: 'serif' }}
      >
        {/* Close Button */}
        <button
          className="absolute top-6 right-6 bg-[#d4af37] text-white rounded-full w-10 h-10 flex items-center justify-center shadow hover:bg-black lux-cta-transition"
          onClick={handleClose}
        >
          ✕
        </button>



        <div className="lg:hidden w-full">
          <div className="mb-1 flex flex-col sm:flex-row sm:justify-center sm:items-center items-start gap-2">
            <label htmlFor="occasion-select-mobile" className="sm:mr-2 font-semibold lux-muted">
              Occasion:
            </label>
            <select
              id="occasion-select-mobile"
              value={selectedOccasion}
              onChange={e => setSelectedOccasion(e.target.value)}
              className="w-full sm:w-auto border border-[#bfa77a] rounded-lg px-4 py-2 bg-white/90 text-[#5b4632] font-medium shadow"
            >
              {occasionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Left Section - Camera OR Processed Image */}
        <div className="flex-1 flex flex-col items-center">
          {/* Status Badges */}
          <div className="w-full max-w-md mb-3 flex flex-wrap gap-2 pr-12 sm:pr-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#bfa77a] bg-white/90 px-3 py-1 text-xs">
              <span className="font-semibold text-[#6d4c1e]">Live tone:</span>
              <span className="font-bold text-[#bfa77a] capitalize">{effectiveSkinTone}</span>
              {isCartridgeSelectionMode && (
                <span className="rounded-full border border-[#d4af37] bg-[#fffbe6] px-2 py-0.5 font-semibold text-[#6d4c1e]">
                  Refill Mode
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c6a4] bg-white/90 px-3 py-1 text-xs">
              <span className="font-semibold text-[#6d4c1e]">Region detected:</span>
              <span className="font-bold text-[#bfa77a]">{regionDisplayLabel[recommendationRegion]}</span>
              <span className="text-[#6d4c1e]/70">({regionContext.locale})</span>
            </div>
          </div>

          <div className="relative w-full max-w-md mx-auto luxury-border overflow-hidden rounded-2xl">
            {/* Optional brand logo badge (place your logo at /assets/brand-logo.svg) */}
            <div className="pointer-events-none absolute top-2 left-2 z-10">
              <img
                src="/assets/brand-logo.svg"
                alt="Brand Logo"
                className="h-8 w-8 object-contain drop-shadow-md rounded-full border border-[#d4af37] bg-white/90"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <label className="text-sm font-semibold text-[#6d4c1e]">Lighting</label>
              </div>
              <div className="inline-flex rounded-full border border-[#d9c6a4] overflow-hidden self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setLightingMode('day')}
                  className={`px-3 py-1 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lightingMode === 'day' ? 'bg-[#1c1a17] text-[#f7f2ea]' : 'bg-white/90 text-[#6d4c1e]'}`}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setLightingMode('evening')}
                  className={`px-3 py-1 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${lightingMode === 'evening' ? 'bg-[#1c1a17] text-[#f7f2ea]' : 'bg-white/90 text-[#6d4c1e]'}`}
                >
                  Evening
                </button>
              </div>
            </div>
            
            {/* Show Camera Feed ONLY when no image captured */}
            {!capturedImage && (
              <>
                {/* Zoom Slider */}
                <div className="mb-3 w-[95%] mx-auto lux-card rounded-xl px-4 py-2 zoom-control-card">
                  <div className="flex items-center justify-between text-xs text-[#6d4c1e] mb-1 zoom-control-meta">
                    <span>Zoom</span>
                    <span>{Math.round(zoomTarget * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={2.5}
                    step={0.1}
                    value={zoomTarget}
                    onChange={(e) => setZoomTarget(parseFloat(e.target.value))}
                    className="w-full accent-[#bfa77a] zoom-control-slider"
                  />
                </div>
                <div className="w-full h-64 md:h-80 overflow-hidden flex items-center justify-center bg-black/5 relative camera-lux-frame"
                  style={{ willChange: 'transform' }}>
                  {/* Decorative inner frame */}
                  <div className="camera-lux-inner-frame" />
                  <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="object-cover"
                  style={{ transform: `translateZ(0) scale(${zoom})`, transformOrigin: 'center center', width: '100%', height: '100%', backfaceVisibility: 'hidden', filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                />
                {/* Live lipstick overlay canvas */}
                <canvas
                  ref={liveLipCanvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: 'none', borderRadius: '0.75rem' }}
                />
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {/* Capture Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={captureSnapshot}
                    className="main-action-btn camera-capture-btn"
                  >
                    📸 Monogram Portrait
                  </button>
                </div>
              </>
            )}

            {/* Show Processed Image ONLY when image captured */}
            {capturedImage && (
              <div className="w-full">
                <div className="lux-card rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-[#6d4c1e]">
                        {selectedLipstick.name}
                      </h3>
                      {lipDetected && confidence > 0 && (
                        <p className="text-xs text-[#bfa77a]">
                          ✓ {lipConfidenceStory.label} <span className="text-[#6d4c1e]/70">{lipConfidenceStory.subtle}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleRetake}
                      className="text-sm px-3 py-1 rounded-lg border border-[#bfa77a] text-[#5b4632] hover:bg-[#bfa77a] hover:text-white lux-cta-transition"
                    >
                      Retake
                    </button>
                  </div>
                  
                  {/* Processing or Processed Image */}
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bfa77a] mb-3"></div>
                      <div className="text-[#bfa77a]">Crafting your lip signature with luxury detail...</div>
                    </div>
                  ) : (
                    <img
                      src={(processedImage || capturedImage)!}
                      alt="Lipstick applied"
                      className="w-full h-auto rounded-lg shadow-md"
                      style={{ filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {!capturedImage && (
            <div className="mt-4 w-full max-w-md mx-auto">
              {experienceType === 'in-house' && (
                <div className="lux-card rounded-xl p-3 mb-3">
                  <div className="text-xs font-semibold text-[#6d4c1e] mb-1">Detected cartridges in device</div>
                  <div className="text-[11px] text-[#6d4c1e]/70 mb-2">AI detected these 3 loaded cartridges. Switch only if your physical load is different.</div>
                  <div className="flex flex-wrap gap-2">
                    {inhouseLipstickSets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => setSelectedInhouseSetId(set.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border lux-cta-transition ${
                          selectedInhouseSetId === set.id
                            ? 'border-[#bfa77a] bg-[#1c1a17] text-[#f7f2ea]'
                            : 'border-[#d9c6a4] bg-white/90 text-[#5b4632] hover:bg-white'
                        }`}
                      >
                        {set.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {showProposedShadesSection && (
            <div className="mt-4 w-full max-w-md mx-auto">
              <CartridgeMarquee
                mode="lipstick"
                targetHex={selectedLipstick.hex}
                title={
                  experienceType === 'in-house'
                    ? `${activeInhouseSet.label} — 3 cartridges loaded`
                    : isCartridgeSelectionMode
                      ? 'Cartridge Selection Formula'
                      : 'Cartridge Formula (Buy)'
                }
                selectedShadeName={selectedLipstick.name}
                cartridges={activeCartridges}
                proposedShades={proposedLipstickShades.map((shade) => ({
                  name: shade.name,
                  hex: shade.hex,
                }))}
                highlightCartridgeIds={
                  experienceType === 'in-house'
                    ? activeInhouseSet.cartridges.map((c) => c.id)
                    : intensityAdjustedSelectedMix
                        .filter((mixItem) => mixItem.percentage > 0)
                        .map((mixItem) => mixItem.cartridgeId)
                }
                mixBreakdown={intensityAdjustedSelectedMix.map((mixItem) => ({
                  cartridgeId: mixItem.cartridgeId,
                  percentage: mixItem.percentage,
                }))}
                onShadeSelect={(shade) => {
                  const found = proposedLipstickShades.find((item) => item.name === shade.name);
                  if (found) {
                    handleLipstickSelect(found);
                  }
                }}
                scrollDurationSeconds={36}
              />
              <div className="text-[11px] text-[#6d4c1e]/75 mt-1 text-center px-3">
                {experienceType === 'in-house'
                  ? 'These 3 cartridges were detected as loaded in your device — the shades above are all blends achievable from them.'
                  : isCartridgeSelectionMode
                    ? 'Selection source: this section shows the active 3-cartridge blend mapped to your selected lipstick shade.'
                    : 'Formula source: this section shows the physical 3-cartridge recipe for the selected lipstick shade.'}
              </div>

            </div>
          )}

          {!capturedImage && (
            <div className="mt-3 w-full max-w-md mx-auto">
              <div className="px-3 py-2 rounded-lg border border-[#e4d5bc] bg-white/80 text-xs text-[#6d4c1e]/85 text-center">
                Capture a photo to unlock your Lip Formula and Checkout Assistant.
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 w-full max-w-md mx-auto">
              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <p className="text-red-800 text-sm">⚠️ {errorMessage}</p>
                {!capturedImage && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-xs px-3 py-1.5 rounded-lg border border-[#bfa77a] text-[#5b4632] hover:bg-[#bfa77a] hover:text-white lux-cta-transition"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Opacity Control - Show when image captured */}
          {capturedImage && hasCapturedMonogramPortrait && (
            <div className="mt-4 w-full max-w-md mx-auto">
              <div className="lux-card rounded-xl px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Lipstick Intensity</span>
                  <span className="font-semibold text-[#6d4c1e]">{lipstickOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min={10} 
                  max={100} 
                  step={1}
                  value={lipstickOpacity}
                  onChange={(e) => setLipstickOpacity(parseInt(e.target.value))}
                  className="w-full accent-[#bfa77a] transition-all duration-150"
                  disabled={isProcessing}
                />
              </div>
            </div>
          )}

          {showProposedShadesSection && (
            <>
              {/* Selected Color Info */}
              <div className="mt-4 w-full max-w-md mx-auto text-center">
                <div className="lux-card rounded-xl px-6 py-4 lux-smooth-panel" key={`lip-selected-${selectedLipstick.hex}-${finish}`}>
                  <div className="font-bold text-lg text-[#6d4c1e] mb-2">Selected Shade</div>
                  <div className="flex items-center justify-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-[#bfa77a]"
                      style={{ backgroundColor: selectedLipstick.color }}
                    ></div>
                    <span className="font-semibold text-[#bfa77a]">{selectedLipstick.name} · {finish === 'matte' ? 'Matte' : 'Glossy'}</span>
                  </div>
                  <div className="text-sm text-[#6d4c1e] mt-1">{selectedLipstick.hex}</div>
                </div>
              </div>

              {/* Lip Analysis Data */}
              <div className="mt-4 w-full max-w-md mx-auto">
                <div className="lux-card rounded-xl px-6 py-4 lux-smooth-panel" key={`lip-analysis-${selectedLipstick.hex}-${selectedOccasion}`}>
                  <div className="font-bold text-lg text-[#6d4c1e] mb-3">Recommended Lip Profile</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Lip Hydration:</span> 
                      <span className="font-bold text-[#bfa77a]">{hydrationStory.label} <span className="text-[#6d4c1e]/70 font-medium">{hydrationStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Color Match:</span> 
                      <span className="font-bold text-[#bfa77a]">{colorMatchStory.label} <span className="text-[#6d4c1e]/70 font-medium">{colorMatchStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Lip Volume:</span> 
                      <span className="font-bold text-[#bfa77a]">{volumeStory.label} <span className="text-[#6d4c1e]/70 font-medium">{volumeStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Skin Undertone:</span> 
                      <span className="font-bold text-[#bfa77a]">{currentAnalysis.undertone}</span>
                    </div>
                  </div>
                  
                  {/* Formulation */}
                  <div className="mt-4 pt-3 border-t border-[#bfa77a]/30">
                    <div className="font-bold text-sm text-[#6d4c1e] mb-2">Formula Details</div>
                    <div className="flex justify-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-[#f7e9f2] text-[#bfa77a] font-semibold border border-[#bfa77a] text-xs">
                        Moisturizing ({currentAnalysis.moisturizing}%)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#fdf6f0] text-[#bfa77a] font-semibold border border-[#bfa77a] text-xs">
                        Long-Lasting ({currentAnalysis.longLasting}%)
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#e9e6f5] text-[#bfa77a] font-semibold border border-[#bfa77a] text-xs">
                        UV Protection ({currentAnalysis.uvProtection}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Right Section - Color Palette & Occasion */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-md mx-auto">
            {hasCapturedMonogramPortrait && capturedImage && (
              <>
                <h3 className="lux-title text-2xl mb-6 text-center tracking-[0.2em] uppercase">
                  AI Shade Recommendations
                </h3>
                <div className="text-xs text-[#6d4c1e] mb-3 text-center">
                  AI-curated from your captured portrait, skin tone, and selected occasion.
                </div>
              </>
            )}
            
            {/* Occasion & Finish Controls */}
            <div className="hidden lg:flex mb-4 flex-col sm:flex-row sm:justify-center sm:items-center items-start gap-2">
              <label htmlFor="occasion-select" className="sm:mr-2 font-semibold lux-muted">
                Occasion:
              </label>
              <select
                id="occasion-select"
                value={selectedOccasion}
                onChange={e => setSelectedOccasion(e.target.value)}
                className="w-full sm:w-auto border border-[#bfa77a] rounded-lg px-4 py-2 bg-white/90 text-[#5b4632] font-medium shadow"
              >
                {occasionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {hasCapturedMonogramPortrait && capturedImage && (
              <>
                <div className="-mt-2 mb-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFinish('matte')}
                    className={`w-full px-4 py-2 rounded-lg sm:rounded-l-lg sm:rounded-r-none border lux-cta-transition ${finish==='matte' ? 'bg-[#1c1a17] border-[#bfa77a] text-[#f7f2ea]' : 'bg-white border-[#d9c6a4] text-[#7a664a]'}`}
                  >
                    Matte
                  </button>
                  <button
                    onClick={() => setFinish('glossy')}
                    className={`w-full px-4 py-2 rounded-lg sm:rounded-r-lg sm:rounded-l-none border lux-cta-transition ${finish==='glossy' ? 'bg-[#1c1a17] border-[#bfa77a] text-[#f7f2ea]' : 'bg-white border-[#d9c6a4] text-[#7a664a]'}`}
                  >
                    Glossy
                  </button>
                </div>
              </>
            )}

            {!capturedImage && (
              <div className="lux-card rounded-xl px-6 py-4 mb-8">
                <div className="font-bold text-base text-[#6d4c1e] mb-1">Personalized Shade Recommendations</div>
                <div className="text-sm text-[#6d4c1e]/80">
                  Capture a Monogram Portrait to unlock AI-curated, occasion-aware lipstick recommendations.
                </div>
              </div>
            )}

            {capturedImage && isProposalLoading && (
              <div className="lux-card rounded-xl px-6 py-4 mb-8 flex items-center gap-2 text-[#6d4c1e]">
                <div className="w-5 h-5 border-2 border-[#bfa77a] border-t-transparent rounded-full animate-spin"></div>
                Preparing your personalized lip recommendations...
              </div>
            )}

            {capturedImage && !isProposalLoading && !showProposedShadesSection && (
              <div className="lux-card rounded-xl px-6 py-4 mb-8">
                <div className="font-bold text-base text-[#6d4c1e] mb-1">Personalized Shade Recommendations</div>
                <div className="text-sm text-[#6d4c1e]/80">
                  Recommendations are not ready yet. Retake Monogram Portrait for a fresh recommendation.
                </div>
              </div>
            )}

            {showProposedShadesSection && (
              <>
                <div className="lux-card rounded-xl px-4 py-3 mb-4 text-xs text-[#6d4c1e]/80">
                  <span className="font-semibold text-[#6d4c1e]">AI detected:</span> {effectiveSkinTone} skin tone · {selectedOccasion} occasion · {finish} finish. Shades ranked by undertone harmony and luma proximity.
                </div>
                {/* Color Grid */}
                <div className="w-full grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                  {proposedLipstickShades.map((lipstick) => (
                    <button
                      key={lipstick.name}
                      onClick={() => handleLipstickSelect(lipstick)}
                      disabled={isProcessing}
                      className={`relative w-full flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] ${
                        selectedLipstick.hex === lipstick.hex
                          ? 'border-[#bfa16a] bg-white shadow-lg -translate-y-0.5'
                          : 'border-[#d4af37] bg-white/70 hover:bg-white'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: '16px',
                        boxShadow: '0 2px 8px rgba(191, 161, 106, 0.08)',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full border-2 mb-2 shadow-md"
                        style={{
                          backgroundColor: lipstick.color,
                          borderColor: '#bfa16a',
                          boxShadow: '0 2px 8px rgba(191, 161, 106, 0.18)',
                        }}
                      ></div>
                      {selectedLipstick.hex === lipstick.hex && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1c1a17] text-[#f7f2ea] border border-[#bfa77a]">
                          Selected
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[#6d4c1e] text-center leading-tight">
                        {lipstick.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="lux-card rounded-xl px-4 py-4 mb-6">
                  <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Shade Formula Links</div>
                  <div className="space-y-2">
                    {proposedShadeLinks.map((item) => (
                      <button
                        key={`shade-link-${item.hex}`}
                        type="button"
                        onClick={() => {
                          const linkedShade = proposedLipstickShades.find((shade) => shade.hex === item.hex);
                          if (linkedShade) handleLipstickSelect(linkedShade);
                        }}
                        disabled={isProcessing}
                        className="w-full text-left rounded-lg border border-[#d9c6a4] bg-[#fdf6f0] px-3 py-2 hover:bg-white lux-cta-transition disabled:opacity-60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#6d4c1e]">{item.name}</span>
                          <span className="text-[10px] font-semibold text-[#bfa77a] uppercase tracking-wide">{item.rank}</span>
                        </div>
                        <div className="text-[11px] text-[#6d4c1e]/85 mt-1">{item.formulaText}</div>
                        <div className="text-[11px] text-[#6d4c1e]/70 mt-1">Optimized for {selectedOccasion} · {finish} finish</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {showProposedShadesSection && (
              <>

                <div className="lux-card rounded-xl px-6 py-4 mt-2">
                  <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Wear Guidance</div>
                  <div className="space-y-1 text-xs text-[#6d4c1e]">
                    <div className="flex justify-between">
                      <span>Longevity</span>
                      <span className="font-semibold text-[#bfa77a]">{expectedWearProfile.longevity}</span>
                    </div>
                    <div>{expectedWearProfile.touchUpWindow}</div>
                    <div>{expectedWearProfile.bestSetting}</div>
                  </div>
                </div>

                {/* Checkout Assistant */}
                <div className="lux-card rounded-xl px-6 py-4 mt-4">
                  {experienceType === 'in-house' ? (
                    <div className="font-bold text-base text-[#6d4c1e] mb-2">Dispense This Curated Shade</div>
                  ) : (
                    <div className="font-bold text-base text-[#6d4c1e] mb-2">Checkout Assistant</div>
                  )}
                  {experienceType !== 'in-house' && (
                  <>
                  <button
                    type="button"
                    onClick={handleAddAllCartridgesToCart}
                    className="main-action-btn w-full mb-2"
                    disabled={cartLoadingAll}
                  >
                    {cartLoadingAll ? 'Adding Cartridges...' : 'Add All Cartridges to Cart'}
                  </button>
                  {cartMessage && (
                    <div className="mb-2 text-xs text-[#6d4c1e] bg-[#fdf6f0] border border-[#d9c6a4] rounded-lg px-3 py-2">
                      {cartMessage}
                    </div>
                  )}
                  {hasAddedCartridges && (
                    <button
                      type="button"
                      onClick={handleResetAddedCartridges}
                      className="mb-2 text-xs font-semibold text-[#6d4c1e] underline underline-offset-2 hover:text-[#bfa77a] lux-cta-transition"
                    >
                      Reset added items
                    </button>
                  )}
                  </>
                  )}
                  {experienceType === 'in-house' && (
                    <>
                      <button
                        type="button"
                        onClick={handleReserveFormula}
                        className="main-action-btn w-full"
                        disabled={reservationLoading}
                      >
                        {reservationLoading ? 'Dispensing Selected Shade...' : 'Dispense Selected Shade'}
                      </button>
                      {reservationMessage && (
                        <div className="mt-2 text-xs text-[#6d4c1e] bg-[#fdf6f0] border border-[#d9c6a4] rounded-lg px-3 py-2">
                          {reservationReference && (
                            <div className="font-semibold text-[#bfa77a] mb-1">Ref: {reservationReference}</div>
                          )}
                          {reservationMessage}
                        </div>
                      )}
                    </>
                  )}
                  {experienceType !== 'in-house' && (
                    <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                      <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Buy This Device</div>
                      <div className="rounded-xl border border-[#d9c6a4] bg-white/90 p-3">
                        <img
                          src={skinSignatureDeviceImage}
                          alt="Skin Signature Device"
                          className="w-full h-28 object-contain rounded-lg bg-[#fdf6f0] border border-[#eadcc6]"
                        />
                        <p className="mt-2 text-xs text-[#6d4c1e]">
                          Bring the couture complexion studio home—custom shade precision, every day.
                        </p>
                        {isDeviceAlreadyInCart && (
                          <div className="mt-2 text-xs text-[#6d4c1e] bg-[#fdf6f0] border border-[#d9c6a4] rounded-lg px-3 py-2">
                            This device is already in your cart.
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleAddDeviceToCart}
                          className="main-action-btn w-full mt-3"
                          disabled={deviceCartLoading}
                        >
                          {deviceCartLoading
                            ? 'Adding Device...'
                            : isDeviceAlreadyInCart
                              ? 'Add Device to Cart Again'
                              : 'Add Device to Cart'}
                        </button>
                        {deviceCartMessage && (
                          <div className="mt-2 text-xs text-[#6d4c1e] bg-[#fdf6f0] border border-[#d9c6a4] rounded-lg px-3 py-2">
                            {deviceCartMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {experienceType !== 'in-house' && (
                  <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                    <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Cartridge Refill Plan</div>
                    <div className="space-y-1 text-xs text-[#6d4c1e]">
                      {replenishmentPlan.map((item) => (
                        <div key={item.cartridgeId} className="flex items-center justify-between gap-2">
                          <span className="truncate">{item.cartridgeName} · {item.priority}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-semibold text-[#bfa77a]">{item.etaDays} days</span>
                            <button
                              type="button"
                              onClick={() => addCartridgeToCart(item.cartridgeId, item.percentage)}
                              className="text-[10px] px-2 py-1 rounded-md border border-[#bfa77a] text-[#6d4c1e] bg-white/90 hover:bg-[#f7f2ea] lux-cta-transition"
                              disabled={!!cartLoadingById[item.cartridgeId] || cartLoadingAll || !!addedCartridgeIds[item.cartridgeId]}
                            >
                              {cartLoadingById[item.cartridgeId]
                                ? 'Adding...'
                                : addedCartridgeIds[item.cartridgeId]
                                  ? 'Added'
                                  : 'Add to Cart'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </div>

                {/* Luxury Brand Suggestions */}
                <div className="lux-card rounded-2xl p-6">
                  <div className="font-semibold lux-title text-lg mb-4">
                    Premium Shade Suggestions
                  </div>
                  <ul className="lux-muted text-sm leading-relaxed ml-4">
                    {(luxurySuggestions[effectiveSkinTone][selectedOccasion] || luxurySuggestions[effectiveSkinTone]['office']).map((suggestion) => (
                      <li key={suggestion}>• {normalizeShadeName(suggestion)}</li>
                    ))}
                  </ul>
                </div>

                {/* Tips */}
                <div className="mt-6 lux-card rounded-xl p-4">
                  <h4 className="font-bold text-[#6d4c1e] mb-2">Application Tips</h4>
                  <ul className="text-sm text-[#6d4c1e] space-y-1">
                    <li>• Ensure good lighting for best results</li>
                    <li>• Keep your lips relaxed or slightly parted</li>
                    <li>• Adjust intensity for your preference</li>
                    <li>• Try different shades to find your perfect match</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LipstickTryOnInterface;