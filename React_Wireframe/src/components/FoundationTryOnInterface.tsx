import { useRef, useEffect, useMemo, useState, type FC } from "react";
import { apiFetch, parseApiError } from "../config/api";
import FoundationSwatchPanel from './FoundationSwatchPanel';
import CartridgeMarquee, { type Cartridge } from './CartridgeMarquee';
import skinSignatureDeviceImage from '../assets/SkinSignature.png';
import type { CartItem } from '../hooks/useCart';

type ShadeMix = {
  cartridgeId: string;
  percentage: number;
};

type SkinToneProfile = 'fair' | 'medium' | 'deep';

interface FoundationShade {
  name: string;
  color: string;
  hex: string;
  mix: ShadeMix[];
}

type CartridgeSet = {
  id: 'set-a' | 'set-b';
  label: string;
  cartridges: Cartridge[];
};

const DEVICE_CART_STORAGE_KEY = 'ss-device-in-cart';

const storeCartridges: Cartridge[] = [
  { id: 'F1', name: 'Porcelain Base', hex: '#F2D6C9' },
  { id: 'F2', name: 'Ivory Base', hex: '#E6BFAE' },
  { id: 'F3', name: 'Warm Beige', hex: '#D7B08F' },
  { id: 'F4', name: 'Honey Beige', hex: '#C89B78' },
  { id: 'F5', name: 'Caramel', hex: '#B88763' },
  { id: 'F6', name: 'Tan Blend', hex: '#9C6B52' },
  { id: 'F7', name: 'Mocha Blend', hex: '#7C5C3E' },
  { id: 'F8', name: 'Deep Neutral', hex: '#5B3A29' },
];

const storeShadeRecipes: Array<{ name: string; mix: ShadeMix[] }> = [
  { name: 'Atelier Porcelain 2.5', mix: [{ cartridgeId: 'F2', percentage: 55 }, { cartridgeId: 'F3', percentage: 30 }, { cartridgeId: 'F1', percentage: 15 }] },
  { name: 'Atelier Beige 3.2', mix: [{ cartridgeId: 'F3', percentage: 50 }, { cartridgeId: 'F4', percentage: 30 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'Atelier Warm 3.8', mix: [{ cartridgeId: 'F4', percentage: 46 }, { cartridgeId: 'F5', percentage: 34 }, { cartridgeId: 'F3', percentage: 20 }] },
  { name: 'Signature Neutral 2N', mix: [{ cartridgeId: 'F2', percentage: 60 }, { cartridgeId: 'F3', percentage: 25 }, { cartridgeId: 'F1', percentage: 15 }] },
  { name: 'Signature Neutral 3N', mix: [{ cartridgeId: 'F3', percentage: 52 }, { cartridgeId: 'F4', percentage: 28 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'Signature Neutral 4N', mix: [{ cartridgeId: 'F4', percentage: 48 }, { cartridgeId: 'F5', percentage: 32 }, { cartridgeId: 'F3', percentage: 20 }] },
  { name: 'Velvet Desert 2W', mix: [{ cartridgeId: 'F3', percentage: 56 }, { cartridgeId: 'F4', percentage: 24 }, { cartridgeId: 'F2', percentage: 20 }] },
  { name: 'Velvet Tawny 3W', mix: [{ cartridgeId: 'F5', percentage: 44 }, { cartridgeId: 'F4', percentage: 34 }, { cartridgeId: 'F6', percentage: 22 }] },
  { name: 'Velvet Toasty 4W', mix: [{ cartridgeId: 'F6', percentage: 42 }, { cartridgeId: 'F5', percentage: 31 }, { cartridgeId: 'F7', percentage: 27 }] },
  { name: 'Radiance Honey 4.2', mix: [{ cartridgeId: 'F4', percentage: 50 }, { cartridgeId: 'F5', percentage: 28 }, { cartridgeId: 'F3', percentage: 22 }] },
  { name: 'Radiance Amber 5.2', mix: [{ cartridgeId: 'F6', percentage: 45 }, { cartridgeId: 'F7', percentage: 30 }, { cartridgeId: 'F5', percentage: 25 }] },
  { name: 'Radiance Deep 6.3', mix: [{ cartridgeId: 'F7', percentage: 48 }, { cartridgeId: 'F8', percentage: 30 }, { cartridgeId: 'F6', percentage: 22 }] },
];

const inhouseCartridgeSets: CartridgeSet[] = [
  {
    id: 'set-a',
    label: 'Warm Nude Blend',
    cartridges: [
      { id: 'A1', name: 'Warm Sand', hex: '#D6B28E' },
      { id: 'A2', name: 'Golden Beige', hex: '#B88B67' },
      { id: 'A3', name: 'Rich Amber', hex: '#8E5D43' },
    ],
  },
  {
    id: 'set-b',
    label: 'Neutral Tan Blend',
    cartridges: [
      { id: 'B1', name: 'Neutral Linen', hex: '#D9BF9F' },
      { id: 'B2', name: 'Soft Tan', hex: '#A97B59' },
      { id: 'B3', name: 'Deep Mocha', hex: '#6C4633' },
    ],
  },
];

const inhouseGradientRatios = [
  [68, 22, 10],
  [58, 27, 15],
  [48, 32, 20],
  [38, 35, 27],
  [28, 36, 36],
  [18, 34, 48],
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function normalizeShadeName(name: string): string {
  return String(name || '')
    .replace(/^\s*(LV|DIOR|MAC|NARS|YSL|CHANEL|GUCCI|FENTY|ARMANI|ESTEE\s+LAUDER)[\s-]+/i, '')
    .trim();
}

function sanitizeFoundationShadeNames(shades: FoundationShade[]): FoundationShade[] {
  return shades.map((shade) => ({
    ...shade,
    name: normalizeShadeName(shade.name),
  }));
}

function mixShadeHex(cartridges: Cartridge[], mix: ShadeMix[]): string {
  const cartridgeMap = new Map(cartridges.map((cartridge) => [cartridge.id, cartridge]));
  let r = 0;
  let g = 0;
  let b = 0;
  for (const item of mix) {
    const cartridge = cartridgeMap.get(item.cartridgeId);
    if (!cartridge) continue;
    const rgb = hexToRgb(cartridge.hex);
    r += rgb.r * (item.percentage / 100);
    g += rgb.g * (item.percentage / 100);
    b += rgb.b * (item.percentage / 100);
  }
  return rgbToHex(r, g, b);
}

function buildStoreShades(recipes: Array<{ name: string; mix: ShadeMix[] }>): FoundationShade[] {
  return recipes.map((recipe) => {
    const hex = mixShadeHex(storeCartridges, recipe.mix);
    return {
      name: normalizeShadeName(recipe.name),
      hex,
      color: hex,
      mix: recipe.mix,
    };
  });
}

function buildInhouseShades(set: CartridgeSet): FoundationShade[] {
  return inhouseGradientRatios.map((ratio, index) => {
    const mix: ShadeMix[] = set.cartridges.map((cartridge, cartridgeIndex) => ({
      cartridgeId: cartridge.id,
      percentage: ratio[cartridgeIndex],
    }));
    const hex = mixShadeHex(set.cartridges, mix);
    return {
      name: `${set.label} ${index < 3 ? `Light ${index + 1}` : `Deep ${index - 2}`}`,
      hex,
      color: hex,
      mix,
    };
  });
}

function estimateLuma(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function normalizeSkinToneProfile(value?: string): SkinToneProfile {
  if (!value) return 'medium';
  const v = value.toLowerCase();
  if (v.includes('fair') || v.includes('light') || v.includes('ivory') || v.includes('porcelain')) return 'fair';
  if (v.includes('deep') || v.includes('dark') || v.includes('ebony') || v.includes('rich')) return 'deep';
  return 'medium';
}

function adaptFoundationShadesForTone(shades: FoundationShade[], skinTone: SkinToneProfile): FoundationShade[] {
  const targetLuma = skinTone === 'fair' ? 195 : skinTone === 'deep' ? 110 : 150;
  return [...shades].sort((left, right) => {
    const leftDelta = Math.abs(estimateLuma(left.hex) - targetLuma);
    const rightDelta = Math.abs(estimateLuma(right.hex) - targetLuma);
    return leftDelta - rightDelta;
  });
}

const occasionOptions = [
  { value: 'casual', label: 'Casual' },
  { value: 'party', label: 'Party' },
  { value: 'office', label: 'Office' },
];

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

const commonLuxuryFoundationByOccasion: Record<RegionKey, Record<string, string[]>> = {
  global: {
    casual: ['Atelier Beige 3.2', 'Signature Neutral 3N', 'Velvet Desert 2W', 'Radiance Honey 4.2'],
    party: ['Atelier Warm 3.8', 'Velvet Tawny 3W', 'Radiance Amber 5.2', 'Radiance Deep 6.3'],
    office: ['Atelier Porcelain 2.5', 'Signature Neutral 2N', 'Signature Neutral 3N', 'Atelier Beige 3.2'],
  },
  americas: {
    casual: ['Atelier Beige 3.2', 'Signature Neutral 3N', 'Radiance Honey 4.2', 'Velvet Desert 2W'],
    party: ['Velvet Tawny 3W', 'Atelier Warm 3.8', 'Radiance Amber 5.2', 'Radiance Deep 6.3'],
    office: ['Signature Neutral 2N', 'Atelier Porcelain 2.5', 'Atelier Beige 3.2', 'Signature Neutral 3N'],
  },
  emea: {
    casual: ['Signature Neutral 3N', 'Atelier Beige 3.2', 'Velvet Desert 2W', 'Atelier Porcelain 2.5'],
    party: ['Atelier Warm 3.8', 'Velvet Tawny 3W', 'Radiance Amber 5.2', 'Radiance Deep 6.3'],
    office: ['Atelier Porcelain 2.5', 'Signature Neutral 2N', 'Signature Neutral 3N', 'Velvet Desert 2W'],
  },
  apac: {
    casual: ['Atelier Porcelain 2.5', 'Signature Neutral 2N', 'Atelier Beige 3.2', 'Velvet Desert 2W'],
    party: ['Atelier Warm 3.8', 'Signature Neutral 4N', 'Velvet Tawny 3W', 'Radiance Amber 5.2'],
    office: ['Atelier Porcelain 2.5', 'Signature Neutral 2N', 'Atelier Beige 3.2', 'Signature Neutral 3N'],
  },
};

function limitCommonLuxuryFoundationShades(
  shades: FoundationShade[],
  occasion: string,
  region: RegionKey,
  shouldLimit: boolean,
): FoundationShade[] {
  if (!shouldLimit) return shades;

  const preferredNames =
    commonLuxuryFoundationByOccasion[region]?.[occasion] ||
    commonLuxuryFoundationByOccasion.global[occasion] ||
    commonLuxuryFoundationByOccasion.global.casual;
  const shadeByName = new Map(shades.map((shade) => [shade.name.toLowerCase(), shade]));
  const curated = preferredNames
    .map((name) => shadeByName.get(name.toLowerCase()))
    .filter((shade): shade is FoundationShade => !!shade);

  const curatedNames = new Set(curated.map((shade) => shade.name.toLowerCase()));
  const fallback = shades.filter((shade) => !curatedNames.has(shade.name.toLowerCase()));

  return [...curated, ...fallback].slice(0, Math.min(4, shades.length));
}

type FoundationAnalysisPayload = {
  skin_tone?: string;
  undertone?: string;
  confidence?: number;
  suggested_shades?: string[];
  [key: string]: unknown;
};

function deriveOccasionAwareShades(
  shades: FoundationShade[],
  analysis: FoundationAnalysisPayload,
  occasion: string,
): FoundationShade[] {
  if (shades.length === 0) return [];

  const occasionLumaOffsets: Record<string, number> = {
    casual: 0,
    office: 4,
    party: -6,
  };

  const analysisTone = normalizeSkinToneProfile(String(analysis.skin_tone || 'medium'));
  const baseTarget = analysisTone === 'fair' ? 195 : analysisTone === 'deep' ? 110 : 150;
  const targetLuma = baseTarget + (occasionLumaOffsets[occasion] ?? 0);
  const undertone = String(analysis.undertone || '').toLowerCase();

  const warmKeywords = ['warm', 'honey', 'gold', 'amber', 'caramel', 'desert', 'tawny'];
  const coolKeywords = ['cool', 'rose', 'porcelain', 'ivory'];
  const neutralKeywords = ['neutral', 'beige', 'linen'];

  const scoreShade = (shade: FoundationShade): number => {
    const lumaDelta = Math.abs(estimateLuma(shade.hex) - targetLuma);
    const shadeName = shade.name.toLowerCase();
    const nameBonus = undertone.includes('warm')
      ? (warmKeywords.some((token) => shadeName.includes(token)) ? -12 : 0)
      : undertone.includes('cool')
        ? (coolKeywords.some((token) => shadeName.includes(token)) ? -12 : 0)
        : (neutralKeywords.some((token) => shadeName.includes(token)) ? -10 : 0);
    return lumaDelta + nameBonus;
  };

  return [...shades]
    .sort((left, right) => scoreShade(left) - scoreShade(right))
    .slice(0, Math.min(6, shades.length));
}

function coerceScore(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function luxuryTier(score: number): 'Atelier Elite' | 'Atelier Signature' | 'Atelier Refinement' {
  if (score >= 86) return 'Atelier Elite';
  if (score >= 72) return 'Atelier Signature';
  return 'Atelier Refinement';
}

function scoreDescriptor(score: number): string {
  if (score >= 92) return 'Exceptional Match';
  if (score >= 84) return 'Refined Match';
  if (score >= 74) return 'Elevated Match';
  if (score >= 64) return 'Harmonized Match';
  return 'Developing Match';
}

function scoreStory(score: number): { label: string; subtle: string } {
  const normalized = coerceScore(score, 0);
  return {
    label: scoreDescriptor(normalized),
    subtle: `(${normalized}%)`,
  };
}

interface FoundationTryOnInterfaceProps {
  onClose?: () => void;
  experienceType?: 'store' | 'in-house';
  skintone?: SkinToneProfile;
  toneConfidence?: number;
  launchMode?: 'store' | 'cartridge' | 'in-house';
  onCartUpdate?: (item: Omit<CartItem, 'uid' | 'addedAt'>) => void;
  onOpenCart?: () => void;
}

const FoundationTryOnInterface: FC<FoundationTryOnInterfaceProps> = ({ onClose, experienceType = 'store', skintone = 'medium', toneConfidence = 0, launchMode = 'store', onCartUpdate, onOpenCart }) => {
  const [selectedInhouseSetId, setSelectedInhouseSetId] = useState<'set-a' | 'set-b'>('set-a');
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
  const activeInhouseSet = useMemo(
    () => inhouseCartridgeSets.find((set) => set.id === selectedInhouseSetId) || inhouseCartridgeSets[0],
    [selectedInhouseSetId],
  );
  const activeCartridges = useMemo(
    () => (experienceType === 'store' ? storeCartridges : activeInhouseSet.cartridges),
    [experienceType, activeInhouseSet],
  );
  const [detectedSkinTone, setDetectedSkinTone] = useState<SkinToneProfile>(normalizeSkinToneProfile(skintone));
  const effectiveSkinTone = useMemo(() => normalizeSkinToneProfile(detectedSkinTone || skintone), [detectedSkinTone, skintone]);
  const foundationShades = useMemo(() => {
    const baseShades = experienceType === 'store' ? buildStoreShades(storeShadeRecipes) : buildInhouseShades(activeInhouseSet);
    return sanitizeFoundationShadeNames(adaptFoundationShadesForTone(baseShades, effectiveSkinTone));
  }, [experienceType, activeInhouseSet, effectiveSkinTone]);
  const [selectedShade, setSelectedShade] = useState<FoundationShade>(foundationShades[0]);
  // New: finish preset for realism
  const [finish, setFinish] = useState<'Matte' | 'Satin' | 'Radiant'>('Satin');
  const [lightingMode, setLightingMode] = useState<'day' | 'evening'>('day');
  const [hasCapturedMonogramPortrait, setHasCapturedMonogramPortrait] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [fullAnalysis, setFullAnalysis] = useState<any | null>(null);
  const [fullAnalysisLoading, setFullAnalysisLoading] = useState(false);
  const [isProposalLoading, setIsProposalLoading] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [proposedShades, setProposedShades] = useState<FoundationShade[]>([]);
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
    () => `ss-added-cartridges:foundation:${experienceType}:${launchMode}:${selectedShade.hex.toLowerCase()}:${finish.toLowerCase()}`,
    [experienceType, launchMode, selectedShade.hex, finish],
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null);
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

  // Track if a shade is selected
  const [shadeSelected, setShadeSelected] = useState<boolean>(true);
  const [sliderPos, setSliderPos] = useState(50); // before/after slider % (0-100)

  useEffect(() => {
    if (foundationShades.length === 0) return;
    setSelectedShade((previousShade) => {
      const matchedShade = foundationShades.find(
        (shade) => shade.hex.toLowerCase() === previousShade.hex.toLowerCase(),
      );
      return matchedShade || foundationShades[0];
    });
    setShadeSelected(true);
  }, [foundationShades]);

  useEffect(() => {
    setDetectedSkinTone(normalizeSkinToneProfile(skintone));
  }, [skintone]);

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
      const reason = err instanceof Error ? err.message : 'Unknown camera error';
      setErrorMessage(`Unable to access camera. Please check permissions. (${reason})`);
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, []);

  // Use MediaPipe FaceMesh to detect face landmarks on captured image
  const detectFaceLandmarks = async (image: HTMLImageElement) => {
    // Dynamically import mediapipe facemesh
    const mp = await import('@mediapipe/face_mesh');
    // Fix: FaceMesh is the class, not a property of FaceMesh
    const faceMesh = new mp.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    return new Promise<any>((resolve) => {
      faceMesh.onResults((results: any) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          resolve(results.multiFaceLandmarks[0]);
        } else {
          resolve(null);
        }
      });
      faceMesh.send({ image });
    });
  };

  // Draw foundation overlay using detected landmarks
  const drawFoundationOverlay = (img: HTMLImageElement, landmarks: any, hexColor: string) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (landmarks && landmarks.length > 0) {
      // Compute face bounding box from landmarks
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of landmarks) {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      const faceW = Math.max(10, maxX - minX);
      const faceH = Math.max(10, maxY - minY);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Expand bbox to include forehead, ears, and neck (heuristics)
      const expandLeft = faceW * 0.10;   // ears
      const expandRight = faceW * 0.10;  // ears
      const expandTop = faceH * 0.12;    // forehead
      const expandBottom = faceH * 0.18; // neck

      const boxX = Math.max(0, minX - expandLeft);
      const boxY = Math.max(0, minY - expandTop);
      const boxW = Math.min(canvas.width - boxX, faceW + expandLeft + expandRight);
      const boxH = Math.min(canvas.height - boxY, faceH + expandTop + expandBottom);

      // Rounded-rect path for smoother edges
      const radius = Math.max(8, Math.min(boxW, boxH) * 0.12);
      const path = new Path2D();
      path.moveTo(boxX + radius, boxY);
      path.lineTo(boxX + boxW - radius, boxY);
      path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
      path.lineTo(boxX + boxW, boxY + boxH - radius);
      path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
      path.lineTo(boxX + radius, boxY + boxH);
      path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
      path.lineTo(boxX, boxY + radius);
      path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

      // Feathered fill with realistic blending
      ctx.save();
      ctx.clip(path);
      // Multiply blend gives natural foundation look
      ctx.globalCompositeOperation = 'multiply';
      // Base fill with low alpha
      ctx.fillStyle = hexColor && hexColor.startsWith('#') ? hexColor : '#bfa77a';
      ctx.globalAlpha = finishLightingProfile.fillAlpha;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Soft radial feather toward center to avoid hard edges
      // Helper: convert hex to rgb
      const toRgb = (hex: string) => {
        const h = hex.replace('#','');
        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };
      const { r, g, b } = toRgb(hexColor && hexColor.startsWith('#') ? hexColor : '#bfa77a');

      const grad = ctx.createRadialGradient(
        cx,
        cy - faceH * 0.08,
        Math.min(faceW, faceH) * 0.15,
        cx,
        cy - faceH * 0.08,
        Math.max(boxW, boxH) * 0.6
      );
      // Blend color stops from stronger center to softer edges
      grad.addColorStop(0.0, `rgba(${r},${g},${b},0.45)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
      ctx.globalAlpha = finishLightingProfile.featherAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Subtle highlight for realistic finish
      ctx.globalCompositeOperation = 'screen';
      const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
      glow.addColorStop(0, 'rgba(255,255,255,0.10)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = finishLightingProfile.glowAlpha;
      ctx.fillStyle = glow;
      ctx.fillRect(boxX, boxY, boxW, boxH);

      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  // Use backend to apply foundation with MediaPipe
  const applyFoundationWithBackend = async (imageData: string, foundationColor: string) => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const normalizedColor = foundationColor.trim();
      if (!normalizedColor) {
        throw new Error('No foundation shade selected');
      }
      const response = await apiFetch('/v1/apply-foundation-mediapipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          foundation_color: normalizedColor,
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
        setFaceDetected(result.face_detected);
        setConfidence(result.confidence || 0);
      } else {
        setErrorMessage(result.message || 'Failed to detect face. Please try again.');
        setProcessedImage(null);
        setFaceDetected(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error applying foundation:', error);
      setErrorMessage(`Failed to process image: ${message}`);
      setProcessedImage(null);
      setFaceDetected(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // 📸 Capture Photo button logic
  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    const imageData = canvas.toDataURL('image/jpeg');
    setHasCapturedMonogramPortrait(true);
    setCapturedImage(imageData);
    setErrorMessage('');
    setAnalysisReady(false);
    setIsProposalLoading(true);

    try {
      // Always use hex code
      await applyFoundationWithBackend(imageData, selectedShade.hex);

      const analysisResponse = await apiFetch('/v1/skin-full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          foundation_color: selectedShade.hex,
          finish,
          region_context: regionContext,
        }),
      });

      const analysisResult = await analysisResponse.json() as {
        success?: boolean;
        analysis?: FoundationAnalysisPayload;
        message?: string;
      };

      if (!analysisResponse.ok || !analysisResult.success || !analysisResult.analysis) {
        throw new Error(analysisResult.message || 'Skin analysis failed.');
      }

      const analysis = analysisResult.analysis;
      setFullAnalysis(analysis);

      const analyzedTone = normalizeSkinToneProfile(String(analysis.skin_tone || effectiveSkinTone));
      setDetectedSkinTone(analyzedTone);

      const baseShades = experienceType === 'store'
        ? buildStoreShades(storeShadeRecipes)
        : buildInhouseShades(activeInhouseSet);
      const toneAdapted = adaptFoundationShadesForTone(baseShades, analyzedTone);
      const occasionShades = deriveOccasionAwareShades(toneAdapted, analysis, selectedOccasion);
      const sanitizedOccasionShades = sanitizeFoundationShadeNames(occasionShades);
      const limitedOccasionShades = limitCommonLuxuryFoundationShades(
        sanitizedOccasionShades,
        selectedOccasion,
        recommendationRegion,
        experienceType === 'store' || launchMode === 'cartridge',
      );
      setProposedShades(limitedOccasionShades);
      setSelectedShade((previous) => {
        const matched = limitedOccasionShades.find((shade) => shade.hex.toLowerCase() === previous.hex.toLowerCase());
        return matched || limitedOccasionShades[0] || previous;
      });
      setAnalysisReady(limitedOccasionShades.length > 0);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to generate proposed shades.';
      setErrorMessage(`Captured image processed, but proposal analysis failed. (${reason})`);
      setProposedShades([]);
      setAnalysisReady(false);
    } finally {
      setIsProposalLoading(false);
    }
  };

  // Retake photo
  const handleRetake = () => {
    setHasCapturedMonogramPortrait(false);
    setCapturedImage(null);
    setProcessedImage(null);
    setFaceDetected(false);
    setErrorMessage('');
    setConfidence(0);
    setFaceLandmarks(null);
    setIsProcessing(false);
    setFullAnalysis(null);
    setFullAnalysisLoading(false);
    setIsProposalLoading(false);
    setAnalysisReady(false);
    setProposedShades([]);
    setFinish('Satin');
    setLightingMode('day');
    setSelectedShade(foundationShades[0]);
    setShadeSelected(true);
    setZoomTarget(1);
    setZoom(1);
    setSliderPos(50);
    startCamera();
  };

  // Update foundation shade when user selects a new shade
  useEffect(() => {
    if (capturedImage) {
      applyFoundationWithBackend(capturedImage, selectedShade.hex);
    }
    // eslint-disable-next-line
  }, [selectedShade, finish]);

  // When user selects a new shade, redraw overlay if image and landmarks exist
  useEffect(() => {
    if (capturedImage && faceLandmarks) {
      const img = new window.Image();
      img.onload = () => {
        // Always use hex code
        drawFoundationOverlay(img, faceLandmarks, selectedShade.hex);
        setProcessedImage(canvasRef.current?.toDataURL('image/jpeg') || null);
      };
      img.src = capturedImage;
    }
    // eslint-disable-next-line
  }, [selectedShade, faceLandmarks]);

  const handleShadeSelect = (shade: FoundationShade) => {
    setSelectedShade(shade);
    setShadeSelected(true);
    // If in-house, command device to dispense from the selected 3-cartridge mix
    if (experienceType === 'in-house') {
      apiFetch('/device/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'foundation',
          selected_hex: shade.hex,
          cartridges: shade.mix.map((mixItem) => mixItem.cartridgeId),
          proportions: shade.mix.map((mixItem) => mixItem.percentage),
          quantity_ml: 0.5,
          region_context: regionContext,
        }),
      }).catch(() => console.warn('Device dispense call failed (simulated).'));
    }
    // Immediately show the selected shade on the captured image (if available)
    if (capturedImage) {
      const img = new window.Image();
      img.onload = () => {
        detectFaceLandmarks(img).then(landmarks => {
          setFaceLandmarks(landmarks);
          if (landmarks) {
            drawFoundationOverlay(img, landmarks, shade.hex);
            setProcessedImage(canvasRef.current?.toDataURL('image/jpeg') || null);
          }
        });
      };
      img.src = capturedImage;
    }
  };

  // Live foundation overlay using face-api.js landmarks (eyes/lips exclusion)
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    (async () => {
      if (!videoRef.current || !liveOverlayCanvasRef.current || capturedImage) return;
      const faceapi = await import('face-api.js');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      ]);

      const run = async () => {
        if (cancelled || !videoRef.current || !liveOverlayCanvasRef.current) return;
        const video = videoRef.current;
        const overlay = liveOverlayCanvasRef.current;
        if (!video.videoWidth || !video.videoHeight) {
          timer = window.setTimeout(run, 80);
          return;
        }
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        const ctx = overlay.getContext('2d');
        if (!ctx) {
          timer = window.setTimeout(run, 80);
          return;
        }
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        const det = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        if (!det || !det.landmarks) {
          // Fallback: soft radial overlay centered on face area
          const cx = overlay.width / 2;
          const cy = overlay.height * 0.45;
          const faceW = overlay.width * 0.35;
          const faceH = overlay.height * 0.45;
          const boxX = cx - faceW / 2;
          const boxY = cy - faceH / 2;
          const boxW = faceW;
          const boxH = faceH;
          const radius = Math.max(8, Math.min(boxW, boxH) * 0.14);
          const path = new Path2D();
          path.moveTo(boxX + radius, boxY);
          path.lineTo(boxX + boxW - radius, boxY);
          path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
          path.lineTo(boxX + boxW, boxY + boxH - radius);
          path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
          path.lineTo(boxX + radius, boxY + boxH);
          path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
          path.lineTo(boxX, boxY + radius);
          path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

          ctx.save();
          ctx.clip(path);
          ctx.globalCompositeOperation = 'multiply';
          ctx.globalAlpha = finishLightingProfile.fillAlpha;
          ctx.fillStyle = selectedShade.hex;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.globalCompositeOperation = 'screen';
          const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
          glow.addColorStop(0, 'rgba(255,255,255,0.10)');
          glow.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = finishLightingProfile.glowAlpha;
          ctx.fillStyle = glow;
          ctx.fillRect(boxX, boxY, boxW, boxH);
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          timer = window.setTimeout(run, 120);
          return;
        }
        const positions = det.landmarks.positions;
        // Compute face bbox
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of positions) {
          const x = p.x;
          const y = p.y;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        const faceW = Math.max(10, maxX - minX);
        const faceH = Math.max(10, maxY - minY);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        // Expand to include forehead/ears/neck
        const expandLeft = faceW * 0.12;
        const expandRight = faceW * 0.12;
        const expandTop = faceH * 0.15;
        const expandBottom = faceH * 0.22;
        const boxX = Math.max(0, minX - expandLeft);
        const boxY = Math.max(0, minY - expandTop);
        const boxW = Math.min(overlay.width - boxX, faceW + expandLeft + expandRight);
        const boxH = Math.min(overlay.height - boxY, faceH + expandTop + expandBottom);

        // Rounded rectangle path
        const radius = Math.max(8, Math.min(boxW, boxH) * 0.14);
        const path = new Path2D();
        path.moveTo(boxX + radius, boxY);
        path.lineTo(boxX + boxW - radius, boxY);
        path.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + radius);
        path.lineTo(boxX + boxW, boxY + boxH - radius);
        path.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - radius, boxY + boxH);
        path.lineTo(boxX + radius, boxY + boxH);
        path.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - radius);
        path.lineTo(boxX, boxY + radius);
        path.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);

        // Fill with multiply blending
        ctx.save();
        ctx.clip(path);
        ctx.globalCompositeOperation = 'multiply';
        const toRgb = (hex: string) => {
          const h = hex.replace('#','');
          const bigint = parseInt(h.length === 3 ? h.split('').map(c => c+c).join('') : h, 16);
          const r = (bigint >> 16) & 255;
          const g = (bigint >> 8) & 255;
          const b = bigint & 255;
          return { r, g, b };
        };
        const { r, g, b } = toRgb(selectedShade.hex);
        ctx.globalAlpha = finishLightingProfile.fillAlpha;
        ctx.fillStyle = selectedShade.hex;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Feathered gradient toward edges
        const grad = ctx.createRadialGradient(
          cx,
          cy - faceH * 0.08,
          Math.min(faceW, faceH) * 0.15,
          cx,
          cy - faceH * 0.08,
          Math.max(boxW, boxH) * 0.6
        );
        grad.addColorStop(0.0, `rgba(${r},${g},${b},0.45)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.15)`);
        grad.addColorStop(1.0, `rgba(${r},${g},${b},0.0)`);
        ctx.globalAlpha = finishLightingProfile.featherAlpha;
        ctx.fillStyle = grad;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Subtle glow based on finish
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(cx, cy - faceH * 0.10, 0, cx, cy - faceH * 0.10, faceW * 0.35);
        glow.addColorStop(0, 'rgba(255,255,255,0.10)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = finishLightingProfile.glowAlpha;
        ctx.fillStyle = glow;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Exclude eyes and lips using destination-out
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        const drawPolygon = (pts: any[]) => {
          if (!pts || pts.length === 0) return;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.closePath();
          ctx.fill();
        };
        const lips = det.landmarks.getMouth();
        const leftEye = det.landmarks.getLeftEye();
        const rightEye = det.landmarks.getRightEye();
        // Slightly expand eye polygons to include eyelids
        const expand = (pts: any[], amt: number) => pts.map(p => ({ x: p.x + (p.x - cx) * amt, y: p.y + (p.y - cy) * amt }));
        drawPolygon(lips as any);
        drawPolygon(expand(leftEye as any, 0.08));
        drawPolygon(expand(rightEye as any, 0.08));

        // Restore to normal for next frame
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';

        timer = window.setTimeout(run, 80); // ~12.5 fps for lightweight processing
      };
      run();
    })();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [selectedShade.hex, finish, lightingMode, capturedImage]);

  // Close button handler
  const handleClose = () => {
    setHasCapturedMonogramPortrait(false);
    setCapturedImage(null);
    setProcessedImage(null);
    setFaceDetected(false);
    setConfidence(0);
    setErrorMessage('');
    setSelectedShade(foundationShades[0]);
    setShadeSelected(true);
    setIsProposalLoading(false);
    setAnalysisReady(false);
    setProposedShades([]);
    if (onClose) {
      onClose();
    }
  };

  // Full analysis handler (dummy implementation)
  const handleFullAnalysis = async () => {
    if (!capturedImage) {
      setFullAnalysis({ error: 'Capture an image first.' });
      return;
    }
    setFullAnalysisLoading(true);
    try {
      const resp = await apiFetch('/v1/skin-full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          foundation_color: selectedShade.hex,
          region_context: regionContext,
        })
      });
      const data = await resp.json();
      if (data.success) {
        setFullAnalysis(data.analysis);
        const toneHint = data.analysis?.undertone || data.analysis?.skin_tone || data.analysis?.skin_tone_hex;
        setDetectedSkinTone(normalizeSkinToneProfile(String(toneHint || skintone)));
      } else {
        setFullAnalysis({ error: data.message || 'Analysis failed.' });
      }
    } catch (e) {
      setFullAnalysis({ error: (e as Error).message });
    } finally {
      setFullAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (!capturedImage || !analysisReady || !fullAnalysis || fullAnalysis.error) return;

    const analysisPayload = fullAnalysis as FoundationAnalysisPayload;
    const analyzedTone = normalizeSkinToneProfile(String(analysisPayload.skin_tone || effectiveSkinTone));
    const baseShades = experienceType === 'store'
      ? buildStoreShades(storeShadeRecipes)
      : buildInhouseShades(activeInhouseSet);
    const toneAdapted = adaptFoundationShadesForTone(baseShades, analyzedTone);
    const occasionShades = deriveOccasionAwareShades(toneAdapted, analysisPayload, selectedOccasion);
    const sanitizedOccasionShades = sanitizeFoundationShadeNames(occasionShades);
    const limitedOccasionShades = limitCommonLuxuryFoundationShades(
      sanitizedOccasionShades,
      selectedOccasion,
      recommendationRegion,
      experienceType === 'store' || launchMode === 'cartridge',
    );
    setProposedShades(limitedOccasionShades);
    setSelectedShade((previous) => {
      const matched = limitedOccasionShades.find((shade) => shade.hex.toLowerCase() === previous.hex.toLowerCase());
      return matched || limitedOccasionShades[0] || previous;
    });
  }, [selectedOccasion, capturedImage, analysisReady, fullAnalysis, experienceType, launchMode, activeInhouseSet, effectiveSkinTone, recommendationRegion]);

  const cartridgeNameMap = useMemo(
    () => new Map(activeCartridges.map((cartridge) => [cartridge.id, cartridge.name])),
    [activeCartridges],
  );

  const marqueeProposedShades = useMemo(
    () => proposedShades.map((shade) => ({ name: shade.name, hex: shade.hex })),
    [proposedShades],
  );

  const alternativeShades = useMemo(() => {
    if (proposedShades.length <= 1) return [] as Array<{ shade: FoundationShade; deltaLuma: number }>;

    const selectedLuma = estimateLuma(selectedShade.hex);
    const candidates = proposedShades
      .filter((shade) => shade.name !== selectedShade.name)
      .map((shade) => ({
        shade,
        deltaLuma: Math.round(estimateLuma(shade.hex) - selectedLuma),
      }));

    const nearestLighter = [...candidates]
      .filter((candidate) => candidate.deltaLuma > 0)
      .sort((left, right) => left.deltaLuma - right.deltaLuma)[0];

    const nearestDarker = [...candidates]
      .filter((candidate) => candidate.deltaLuma < 0)
      .sort((left, right) => right.deltaLuma - left.deltaLuma)[0];

    const nearestAny = [...candidates].sort(
      (left, right) => Math.abs(left.deltaLuma) - Math.abs(right.deltaLuma),
    );

    const picked = [nearestLighter, nearestDarker, ...nearestAny].filter(
      (candidate): candidate is { shade: FoundationShade; deltaLuma: number } => !!candidate,
    );

    const seen = new Set<string>();
    return picked.filter((candidate) => {
      if (seen.has(candidate.shade.name)) return false;
      seen.add(candidate.shade.name);
      return true;
    }).slice(0, 2);
  }, [proposedShades, selectedShade]);

  const showProposedShadesSection = hasCapturedMonogramPortrait && capturedImage && analysisReady && proposedShades.length > 0;

  const isCartridgeSelectionMode = launchMode === 'cartridge';

  const luxuryAnalysisView = useMemo(() => {
    if (!fullAnalysis || fullAnalysis.error) return null;

    const textureScore = coerceScore(fullAnalysis.texture_score, 78);
    const evennessScore = coerceScore(fullAnalysis.evenness_score, 80);
    const hydrationScore = coerceScore(fullAnalysis.hydration_score, 76);
    const poreScore = coerceScore(fullAnalysis.pore_refinement_score, 74);
    const complexionIndex = Math.round((textureScore + evennessScore + hydrationScore + poreScore) / 4);
    const tier = luxuryTier(complexionIndex);

    const undertone = String(fullAnalysis.undertone || 'Neutral');
    const toneHex = String(fullAnalysis.skin_tone_hex || selectedShade.hex);
    const confidenceValue = toneConfidence > 0 ? toneConfidence : coerceScore(fullAnalysis.confidence, 89);

    const finishingRecommendation = hydrationScore < 60
      ? 'Satin finish is recommended to preserve comfort and blur dryness.'
      : hydrationScore > 84
        ? 'Radiant finish is recommended to elevate glow while keeping natural depth.'
        : 'Matte or Satin finish will both hold well; choose based on occasion lighting.';

    const refinementPriority = poreScore < 70
      ? 'Prime the T-zone for smoother diffusion and reduced pore visibility.'
      : evennessScore < 72
        ? 'Use a thin corrective pass on high-contrast zones before final blend.'
        : 'Maintain a single uniform pass; your base already reads balanced.';

    const suggestedShades = Array.isArray(fullAnalysis.suggested_shades)
      ? fullAnalysis.suggested_shades
        .filter((shade: unknown) => typeof shade === 'string' && shade.trim().length > 0)
        .map((shade: string) => normalizeShadeName(shade))
      : [];

    const conciergeTips = Array.isArray(fullAnalysis.luxury_recommendations)
      ? fullAnalysis.luxury_recommendations.filter((tip: unknown) => typeof tip === 'string' && tip.trim().length > 0)
      : [];

    const fallbackShadeSuggestions = alternativeShades.map((candidate) => candidate.shade.name);

    return {
      textureScore,
      evennessScore,
      hydrationScore,
      poreScore,
      complexionIndex,
      tier,
      undertone,
      toneHex,
      confidenceValue,
      finishingRecommendation,
      refinementPriority,
      suggestedShades: suggestedShades.length > 0 ? suggestedShades : fallbackShadeSuggestions,
      conciergeTips,
    };
  }, [fullAnalysis, selectedShade.hex, toneConfidence, alternativeShades]);

  const confidenceStory = useMemo(() => scoreStory(confidence || 89), [confidence]);
  const skinIndexStory = useMemo(() => scoreStory(85), []);
  const highlightStory = useMemo(() => scoreStory(80), []);

  const finishLightingProfile = useMemo(() => {
    const dayMultiplier = lightingMode === 'day' ? 1 : 1.12;
    const baseAlpha = finish === 'Radiant' ? 0.33 : finish === 'Satin' ? 0.35 : 0.38;
    const gradientAlpha = finish === 'Radiant' ? 0.24 : finish === 'Satin' ? 0.18 : 0.14;
    const glowAlpha = finish === 'Radiant' ? 0.25 : finish === 'Satin' ? 0.15 : 0.08;
    return {
      fillAlpha: Math.min(0.5, baseAlpha * dayMultiplier),
      featherAlpha: Math.min(0.35, gradientAlpha * dayMultiplier),
      glowAlpha: Math.min(0.4, glowAlpha * (lightingMode === 'day' ? 0.95 : 1.18)),
      mediaFilter: lightingMode === 'day'
        ? 'brightness(1.01) saturate(1.02)'
        : 'brightness(0.95) contrast(1.05) saturate(1.06)',
    };
  }, [finish, lightingMode]);

  const replenishmentPlan = useMemo(() => {
    return [...selectedShade.mix]
      .sort((left, right) => right.percentage - left.percentage)
      .map((mixItem, index) => ({
        cartridgeId: mixItem.cartridgeId,
        cartridgeName: cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId,
        percentage: mixItem.percentage,
        priority: index === 0 ? 'Priority refill' : index === 1 ? 'Secondary refill' : 'Support refill',
        etaDays: index === 0 ? 18 : index === 1 ? 24 : 30,
      }));
  }, [selectedShade.mix, cartridgeNameMap]);

  const proposedShadeLinks = useMemo(() => {
    return proposedShades.map((shade, index) => {
      const sortedMix = [...shade.mix]
        .sort((left, right) => right.percentage - left.percentage)
        .slice(0, 3)
        .map((mixItem) => ({
          name: cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId,
          percentage: Math.round(mixItem.percentage),
        }));

      const rank = index === 0 ? 'Top match' : index === 1 ? 'Strong match' : 'Alternative';
      const formulaText = sortedMix.length > 0
        ? sortedMix.map((item) => `${item.name} ${item.percentage}%`).join(' · ')
        : 'Formula details unavailable';

      return {
        name: shade.name,
        hex: shade.hex,
        rank,
        formulaText,
      };
    });
  }, [proposedShades, cartridgeNameMap]);

  const expectedWearProfile = useMemo(() => {
    const baseHours = finish === 'Matte' ? 10 : finish === 'Satin' ? 8 : 7;
    const confidenceBoost = (luxuryAnalysisView?.confidenceValue || confidence || 82) >= 88 ? 1 : 0;
    const minHours = Math.max(6, baseHours - 1 + confidenceBoost);
    const maxHours = minHours + 2;
    return {
      longevity: `${minHours}-${maxHours}h`,
      touchUpWindow: finish === 'Radiant' ? 'Touch-up every 3-4h' : finish === 'Satin' ? 'Touch-up every 4-5h' : 'Touch-up every 5-6h',
      bestSetting: finish === 'Radiant'
        ? 'Best in evening and event lighting'
        : finish === 'Matte'
          ? 'Best for long daytime wear and humidity control'
          : 'Best for day-to-evening balanced wear',
    };
  }, [finish, luxuryAnalysisView, confidence]);

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
            mode: 'foundation',
            selected_hex: selectedShade.hex,
            cartridges: selectedShade.mix.map((mixItem) => mixItem.cartridgeId),
            proportions: selectedShade.mix.map((mixItem) => mixItem.percentage),
            quantity_ml: 0.5,
            region_context: regionContext,
          }),
        });
        setReservationMessage(`Dispense initiated for ${selectedShade.name}.`);
        return;
      }

      const response = await apiFetch('/v1/reserve-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: 'foundation',
          experience_type: experienceType,
          launch_mode: launchMode,
          shade_name: selectedShade.name,
          shade_hex: selectedShade.hex,
          finish,
          region_context: regionContext,
          cartridges: selectedShade.mix.map((mixItem) => ({
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
        `Reserved ${selectedShade.name}. ${primary?.cartridgeName || 'Primary cartridge'} suggested in ${primary?.etaDays || 21} days.`,
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
  }, [selectedShade.name, finish]);

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
      onCartUpdate?.({
        product_id: 'SS2025-DEVICE',
        product_name: 'Skin Signature Device',
        category: 'device',
        product_type: 'skin-device',
        quantity: 1,
        price: 2499.0,
      });
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
          product_type: 'foundation',
          shade_name: selectedShade.name,
          shade_hex: selectedShade.hex,
          cartridge_id: cartridgeId,
          cartridge_percentage: percentage,
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
      onCartUpdate?.({
        product_id: `CRT-${cartridgeId}`,
        product_name: `${cartridgeName} Cartridge`,
        category: 'cartridge',
        product_type: 'foundation',
        shade_name: selectedShade.name,
        shade_hex: selectedShade.hex,
        cartridge_id: cartridgeId,
        cartridge_percentage: percentage,
        finish,
        quantity: 1,
        price: 0,
      });
      setCartMessage(`${cartridgeName} added to cart.`);
    } catch {
      setCartMessage(`Unable to add ${cartridgeName} right now.`);
    } finally {
      setCartLoadingById((previous) => ({ ...previous, [cartridgeId]: false }));
    }
  };

  const handleAddAllCartridgesToCart = async () => {
    const uniqueMix = Array.from(
      new Map(selectedShade.mix.map((mixItem) => [mixItem.cartridgeId, mixItem])).values(),
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
            product_type: 'foundation',
            shade_name: selectedShade.name,
            shade_hex: selectedShade.hex,
            cartridge_id: mixItem.cartridgeId,
            cartridge_percentage: mixItem.percentage,
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
      uniqueMix.forEach((mixItem) => {
        const cartridgeName = cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId;
        onCartUpdate?.({
          product_id: `CRT-${mixItem.cartridgeId}`,
          product_name: `${cartridgeName} Cartridge`,
          category: 'cartridge',
          product_type: 'foundation',
          shade_name: selectedShade.name,
          shade_hex: selectedShade.hex,
          cartridge_id: mixItem.cartridgeId,
          cartridge_percentage: mixItem.percentage,
          finish,
          quantity: 1,
          price: 0,
        });
      });
      setCartMessage(`All ${successCount} cartridges added to cart.`);
    } else if (successCount > 0) {
      setCartMessage(`${successCount} of ${uniqueMix.length} cartridges added to cart.`);
    } else {
      setCartMessage('Unable to add cartridges to cart right now.');
    }

    setCartLoadingAll(false);
  };

  return (
    <div className="fixed inset-0 z-50 lux-page overflow-y-auto px-4 sm:px-6 py-6">
      <div
        className="relative w-full max-w-5xl mx-auto my-6 rounded-3xl lux-card p-4 sm:p-6 md:p-8 flex flex-col gap-6 min-h-0"
        style={{ fontFamily: 'serif' }}
      >
        {/* Close Button */}
        <button
          className="absolute top-6 right-6 bg-[#d4af37] text-white rounded-full p-2 shadow hover:bg-black lux-cta-transition"
          onClick={handleClose}
        >
          &#10005;
        </button>

        {/* Header Row */}
        <div className="w-full pr-14 sm:pr-0">
          <div className="flex flex-col gap-1 sm:gap-2">
            <div className="inline-flex w-auto items-center gap-2 self-start rounded-full border border-[#bfa77a] bg-white/90 px-3 py-1 text-xs">
              <span className="font-semibold text-[#6d4c1e]">Live tone:</span>
              <span className="font-bold text-[#bfa77a] capitalize">{effectiveSkinTone}</span>
              {toneConfidence > 0 && <span className="text-[#6d4c1e]/70">({toneConfidence}%)</span>}
              {launchMode === 'cartridge' && (
                <span className="rounded-full border border-[#d4af37] bg-[#fffbe6] px-2 py-0.5 font-semibold text-[#6d4c1e]">
                  Refill Mode
                </span>
              )}
            </div>
            <div className="inline-flex w-auto items-center gap-2 self-start rounded-full border border-[#d9c6a4] bg-white/90 px-3 py-1 text-xs">
              <span className="font-semibold text-[#6d4c1e]">Region detected:</span>
              <span className="font-bold text-[#bfa77a]">{regionDisplayLabel[recommendationRegion]}</span>
              <span className="text-[#6d4c1e]/70">({regionContext.locale})</span>
            </div>
          </div>
        </div>

        <div className="md:hidden w-full">
          <div className="mb-1 flex flex-col sm:flex-row sm:justify-center sm:items-center items-start gap-2">
            <label htmlFor="foundation-occasion-select-mobile" className="sm:mr-2 font-semibold lux-muted">
              Occasion:
            </label>
            <select
              id="foundation-occasion-select-mobile"
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="w-full sm:w-auto border border-[#bfa77a] rounded-lg px-4 py-2 bg-white/90 text-[#5b4632] font-medium shadow"
            >
              {occasionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row gap-6 w-full">
          {/* Left Section - Camera & Swatch Panel */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <div className="relative w-full max-w-md mx-auto luxury-border overflow-hidden rounded-2xl">
              {/* Brand logo badge */}
              <div className="pointer-events-none absolute top-2 left-2 z-10">
                <img
                  src="/assets/brand-logo.svg"
                  alt="Brand Logo"
                  className="h-8 w-8 object-contain drop-shadow-md rounded-full border border-[#d4af37] bg-white/90"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {/* Finish selector above camera */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-semibold text-[#6d4c1e]">Finish</label>
                  <select
                    value={finish}
                    onChange={(e) => setFinish(e.target.value as 'Matte' | 'Satin' | 'Radiant')}
                    className="w-full sm:w-auto text-sm border border-[#bfa77a] rounded-lg px-3 py-1 bg-white/95 text-[#5b4632] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  >
                    <option>Matte</option>
                    <option>Satin</option>
                    <option>Radiant</option>
                  </select>
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

              {/* Camera Section Label */}
              {/* <div className="w-full text-center py-1 bg-gray-100 text-gray-700 font-semibold rounded mb-2">
                Camera Section
              </div> */}
              {/* Video Element */}
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
                  <div className="w-full h-64 md:h-80 overflow-hidden flex items-center justify-center bg-black/5 relative camera-lux-frame" style={{ willChange: 'transform' }}>
                    {/* Decorative inner frame */}
                    <div className="camera-lux-inner-frame" />
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ transform: `translateZ(0) scale(${zoom}) scaleX(-1)`, transformOrigin: 'center center', backfaceVisibility: 'hidden', filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                    />
                    {/* Live foundation overlay canvas */}
                    <canvas
                      ref={liveOverlayCanvasRef}
                      className="absolute inset-0 w-full h-full"
                      style={{ pointerEvents: 'none', borderRadius: '0.75rem', transform: 'scaleX(-1)' }}
                    />
                  </div>
                  {/* Hidden canvas for snapshot */}
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Capture Button: Only show after a shade is selected */}
                  {shadeSelected && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={captureSnapshot}
                        className="main-action-btn camera-capture-btn"
                      >
                        📸 Monogram Portrait
                      </button>
                    </div>
                  )}
                </>
              )}
              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 w-full max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                    <span className="font-bold text-yellow-800 block mb-1">Error Message:</span>
                    <p className="text-yellow-800 text-sm">⚠️ {errorMessage}</p>
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
              {/* Processed Image Preview: Show below camera after capture */}
              {capturedImage && hasCapturedMonogramPortrait && (
                <div className="mt-6 w-full max-w-md mx-auto">
                  <div className="lux-card rounded-xl p-4">
                    <div className="font-bold text-[#bfa77a] mb-2">Processed Image Preview</div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-[#6d4c1e]">
                          Your Look: {selectedShade.name}
                        </h3>
                        {faceDetected && confidence > 0 && (
                          <p className="text-xs text-[#bfa77a]">
                            ✓ {confidenceStory.label} <span className="text-[#6d4c1e]/70">{confidenceStory.subtle}</span>
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

                    {/* Before/After slider comparison */}
                    {!isProcessing && (
                      <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ position: 'relative' }}>
                        {/* Before image (original) */}
                        <img
                          src={capturedImage}
                          alt="Before"
                          className="w-full h-auto block"
                          style={{ filter: finishLightingProfile.mediaFilter, transition: 'filter 420ms cubic-bezier(0.22,1,0.36,1)' }}
                        />
                        {/* After image (processed) clipped by slider */}
                        <img
                          src={processedImage || capturedImage}
                          alt="After"
                          className="w-full h-auto block absolute top-0 left-0"
                          style={{
                            clipPath: `inset(0 ${Math.max(0, 100 - sliderPos)}% 0 0)`,
                            transition: 'clip-path 240ms cubic-bezier(0.22,1,0.36,1), filter 420ms cubic-bezier(0.22,1,0.36,1)',
                            filter: finishLightingProfile.mediaFilter,
                          }}
                        />
                      </div>
                    )}

                    {/* Slider moved below the image to avoid overlaying the face */}
                    {!isProcessing && (
                      <div className="mt-3 px-1">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sliderPos}
                          onChange={(e) => setSliderPos(parseInt(e.target.value))}
                          className="w-full accent-[#bfa77a]"
                          aria-label="Before/After Slider"
                        />
                        <div className="flex justify-between text-xs mt-1 text-[#6d4c1e]">
                          <span>Before</span>
                          <span>After</span>
                        </div>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bfa77a] mb-3"></div>
                        <div className="text-[#bfa77a]">Detecting face and applying foundation...</div>
                      </div>
                    )}
                    {/* Legacy buttons retained */}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <button 
                        className="flex-1 text-xs py-1 px-2 rounded border border-[#bfa77a] text-[#bfa77a] hover:bg-[#bfa77a]/10 lux-cta-transition"
                        onClick={() => setProcessedImage(capturedImage)}
                      >
                        Show Before
                      </button>
                      <button 
                        className="flex-1 text-xs py-1 px-2 rounded border border-[#bfa77a] text-[#bfa77a] hover:bg-[#bfa77a]/10 lux-cta-transition"
                        onClick={() => applyFoundationWithBackend(capturedImage!, selectedShade.hex)}
                      >
                        Show After
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!capturedImage && experienceType === 'in-house' && (
              <div className="mt-4 w-full max-w-md mx-auto">
                <div className="lux-card rounded-xl p-3">
                  <div className="text-xs font-semibold text-[#6d4c1e] mb-1">Detected cartridges in device</div>
                  <div className="text-[11px] text-[#6d4c1e]/70 mb-2">AI detected these 3 loaded cartridges. Switch only if your physical load is different.</div>
                  <div className="flex flex-wrap gap-2">
                    {inhouseCartridgeSets.map((set) => (
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
              </div>
            )}

            {showProposedShadesSection && (
              <>
                <CartridgeMarquee
                  mode="foundation"
                  targetHex={selectedShade.hex}
                  title={
                    experienceType === 'in-house'
                      ? `${activeInhouseSet.label} — 3 cartridges loaded`
                      : isCartridgeSelectionMode
                        ? 'Cartridge Selection Formula'
                        : 'Cartridge Formula (Buy)'
                  }
                  selectedShadeName={selectedShade.name}
                  cartridges={activeCartridges}
                  proposedShades={marqueeProposedShades}
                  highlightCartridgeIds={
                    experienceType === 'in-house'
                      ? activeInhouseSet.cartridges.map((c) => c.id)
                      : selectedShade.mix.map((mixItem) => mixItem.cartridgeId)
                  }
                  mixBreakdown={selectedShade.mix.map((mixItem) => ({
                    cartridgeId: mixItem.cartridgeId,
                    percentage: mixItem.percentage,
                  }))}
                  onShadeSelect={(shade) => {
                    const found = proposedShades.find((item) => item.name === shade.name);
                    if (found) {
                      handleShadeSelect(found);
                    }
                  }}
                  scrollDurationSeconds={36}
                />
                <div className="text-[11px] text-[#6d4c1e]/75 mt-1 text-center px-3">
                  {experienceType === 'in-house'
                    ? 'These 3 cartridges were detected as loaded in your device — the shades above are all blends achievable from them.'
                    : isCartridgeSelectionMode
                      ? 'Selection source: this section shows the active 3-cartridge blend mapped to your selected shade.'
                      : 'Formula source: this section shows the physical 3-cartridge recipe for the selected shade.'}
                </div>
              </>
            )}

          </div>
          {/* Right Section - Recommended Foundation Details */}
          <div className="flex-1 flex flex-col items-center justify-start min-w-0">
            <div className="w-full max-w-md mx-auto mt-0 lg:sticky lg:top-10">
              <div className="hidden md:flex mb-4 flex-col sm:flex-row sm:justify-center sm:items-center items-start gap-2">
                <label htmlFor="foundation-occasion-select" className="sm:mr-2 font-semibold lux-muted">
                  Occasion:
                </label>
                <select
                  id="foundation-occasion-select"
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="w-full sm:w-auto border border-[#bfa77a] rounded-lg px-4 py-2 bg-white/90 text-[#5b4632] font-medium shadow"
                >
                  {occasionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {!capturedImage && (
                <div className="lux-card rounded-xl px-6 py-4">
                  <div className="font-bold text-base text-[#6d4c1e] mb-1">Personalized Shade Recommendations</div>
                  <div className="text-sm text-[#6d4c1e]/80">
                    Capture a Monogram Portrait to unlock AI-curated, occasion-aware foundation recommendations.
                  </div>
                </div>
              )}

              {capturedImage && isProposalLoading && (
                <div className="lux-card rounded-xl px-6 py-4 flex items-center gap-2 text-[#6d4c1e]">
                  <div className="w-5 h-5 border-2 border-[#bfa77a] border-t-transparent rounded-full animate-spin"></div>
                  Preparing your personalized complexion recommendations...
                </div>
              )}

              {capturedImage && !isProposalLoading && !showProposedShadesSection && (
                <div className="lux-card rounded-xl px-6 py-4 mb-4">
                  <div className="font-bold text-base text-[#6d4c1e] mb-1">Personalized Shade Recommendations</div>
                  <div className="text-sm text-[#6d4c1e]/80">
                    Recommendations are not ready yet. Retake Monogram Portrait for a fresh recommendation.
                  </div>
                </div>
              )}

              {showProposedShadesSection && (
                <>
                  <div className="lux-card rounded-xl px-6 py-4 mb-4">
                    <div className="text-xs text-[#6d4c1e]/80 mb-2 text-center">
                      AI-curated from your captured portrait and selected occasion.
                    </div>
                    <FoundationSwatchPanel
                      foundationSwatches={proposedShades}
                      selectedFoundation={selectedShade}
                      onSelect={handleShadeSelect}
                      isApplying={!!capturedImage && isProcessing}
                    />
                  </div>

                  <div className="lux-card rounded-xl px-4 py-4 mb-4">
                    <div className="font-semibold text-sm text-[#6d4c1e] mb-2">Shade Formula Links</div>
                    <div className="space-y-2">
                      {proposedShadeLinks.map((item) => (
                        <button
                          key={`foundation-link-${item.hex}`}
                          type="button"
                          onClick={() => {
                            const linkedShade = proposedShades.find((shade) => shade.hex === item.hex);
                            if (linkedShade) handleShadeSelect(linkedShade);
                          }}
                          disabled={isProcessing}
                          className="w-full text-left rounded-lg border border-[#d9c6a4] bg-[#fdf6f0] px-3 py-2 hover:bg-white lux-cta-transition disabled:opacity-60"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#6d4c1e] truncate">{item.name}</span>
                            <span className="text-[10px] font-semibold text-[#bfa77a] uppercase tracking-wide">{item.rank}</span>
                          </div>
                          <div className="text-[11px] text-[#6d4c1e]/85 mt-1">{item.formulaText}</div>
                          <div className="text-[11px] text-[#6d4c1e]/70 mt-1">Optimized for {selectedOccasion} · {finish} finish</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lux-card rounded-xl px-6 py-4 lux-smooth-panel" key={`details-${selectedShade.hex}-${finish}-${lightingMode}`}>
                <div className="font-bold text-lg text-[#6d4c1e] mb-2">AI Recommendation Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#6d4c1e]">Shade:</span>
                    <span className="font-bold text-[#bfa77a]">{selectedShade.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-[#6d4c1e]">Hex:</span>
                    <span className="font-bold text-[#bfa77a]">{selectedShade.hex}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
                  <div className="font-bold text-sm text-[#6d4c1e] mb-2">Skin Analysis</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Skin Index:</span>
                      <span className="font-bold text-[#bfa77a]">{skinIndexStory.label} <span className="text-[#6d4c1e]/70 font-medium">{skinIndexStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Highlight:</span>
                      <span className="font-bold text-[#bfa77a]">{highlightStory.label} <span className="text-[#6d4c1e]/70 font-medium">{highlightStory.subtle}</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#6d4c1e]">Confidence:</span>
                      <span className="font-bold text-[#bfa77a]">{confidenceStory.label} <span className="text-[#6d4c1e]/70 font-medium">{confidenceStory.subtle}</span></span>
                    </div>
                  </div>
                </div>
              </div>

                  {alternativeShades.length > 0 && (
                    <div className="lux-card rounded-xl px-6 py-4 mt-4">
                      <div className="font-bold text-base text-[#6d4c1e] mb-2">Similar Shade Options</div>
                      <div className="text-xs text-[#6d4c1e]/80 mb-3">
                        Quick switch options near your current match.
                      </div>
                      <div className="space-y-2">
                        {alternativeShades.map((candidate) => (
                          <button
                            key={candidate.shade.name}
                            type="button"
                            onClick={() => handleShadeSelect(candidate.shade)}
                            className="w-full flex items-center justify-between rounded-lg border border-[#d9c6a4] bg-white/90 px-3 py-2 text-left hover:bg-white lux-cta-transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-4 w-4 rounded-full border border-[#bfa77a]/70 shrink-0"
                                style={{ backgroundColor: candidate.shade.hex }}
                              />
                              <span className="text-sm font-semibold text-[#6d4c1e] truncate">
                                {candidate.shade.name}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[#bfa77a] shrink-0">
                              {candidate.deltaLuma > 0
                                ? `Lighter +${candidate.deltaLuma}`
                                : `Darker ${candidate.deltaLuma}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                    <div>{cartMessage}</div>
                    {onOpenCart && cartMessage.toLowerCase().includes('added to cart') && (
                      <button
                        type="button"
                        onClick={onOpenCart}
                        className="mt-1 text-[11px] font-semibold text-[#6d4c1e] underline underline-offset-2 hover:text-[#bfa77a] lux-cta-transition"
                      >
                        View Cart
                      </button>
                    )}
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
                          <div>{deviceCartMessage}</div>
                          {onOpenCart && deviceCartMessage.toLowerCase().includes('added to cart') && (
                            <button
                              type="button"
                              onClick={onOpenCart}
                              className="mt-1 text-[11px] font-semibold text-[#6d4c1e] underline underline-offset-2 hover:text-[#bfa77a] lux-cta-transition"
                            >
                              View Cart
                            </button>
                          )}
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

                <div className="mt-3 pt-3 border-t border-[#bfa77a]/30">
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
              </div>
                </>
              )}
            </div>
          </div>
        </div>
        {capturedImage && hasCapturedMonogramPortrait ? (
          <>
            <button
              className="main-action-btn mt-4"
              onClick={handleFullAnalysis}
            >
              Complexion Dossier
            </button>
            {/* Show full analysis modal/section */}
            {fullAnalysis && (
              <div className="mt-4 p-4 bg-white border border-[#bfa77a] rounded-xl shadow">
                {!fullAnalysisLoading && !fullAnalysis.error && (
                  <>
                    <div className="font-bold text-[#bfa77a] mb-3">Luxury Skin Analysis</div>
                    {luxuryAnalysisView && (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="font-semibold text-[#6d4c1e]">Complexion Index:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.complexionIndex}%</span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Luxury Tier:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.tier}</span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Skin Tone Hex:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.toneHex}</span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Undertone:</span> <span className="text-[#bfa77a]">{luxuryAnalysisView.undertone}</span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Texture:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.textureScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.textureScore).subtle}</span></span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Evenness:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.evennessScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.evennessScore).subtle}</span></span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Hydration:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.hydrationScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.hydrationScore).subtle}</span></span></div>
                          <div><span className="font-semibold text-[#6d4c1e]">Pore Refinement:</span> <span className="text-[#bfa77a]">{scoreStory(luxuryAnalysisView.poreScore).label} <span className="text-[#6d4c1e]/70">{scoreStory(luxuryAnalysisView.poreScore).subtle}</span></span></div>
                        </div>

                        <div className="mt-4 p-3 rounded-lg border border-[#d9c6a4] bg-[#fdf6f0]">
                          <div className="font-semibold text-[#6d4c1e] mb-1">Recommended Formula</div>
                          <div className="text-sm text-[#6d4c1e]">
                            {selectedShade.name} · {finish} finish · Confidence {luxuryAnalysisView.confidenceValue}%
                          </div>
                          <div className="text-xs text-[#6d4c1e]/80 mt-1">
                            {selectedShade.mix.map((mixItem) => `${cartridgeNameMap.get(mixItem.cartridgeId) || mixItem.cartridgeId} ${mixItem.percentage}%`).join(' + ')}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="font-semibold text-[#6d4c1e] mb-1">Luxury Finish Direction</div>
                          <p className="text-sm text-[#6d4c1e]/90">{luxuryAnalysisView.finishingRecommendation}</p>
                          <p className="text-sm text-[#6d4c1e]/90 mt-1">{luxuryAnalysisView.refinementPriority}</p>
                        </div>

                        <div className="mt-4">
                          <div className="font-semibold text-[#6d4c1e] mb-1">Suggested Shades</div>
                          <div className="flex flex-wrap gap-2">
                            {(luxuryAnalysisView.suggestedShades || []).map((s: string) => (
                              <span key={s} className="px-3 py-1 rounded-full bg-[#f7e9f2] text-[#bfa77a] border border-[#bfa77a] text-xs font-semibold">{s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="font-semibold text-[#6d4c1e] mb-1">Concierge Notes</div>
                          <ul className="list-disc ml-5 text-[#bfa77a] text-sm space-y-1">
                            {(luxuryAnalysisView.conciergeTips.length > 0
                              ? luxuryAnalysisView.conciergeTips
                              : [
                                  'Blend from center face outward for couture-level diffusion.',
                                  'Set only high-movement zones to retain a natural luxury finish.',
                                  'Layer in thin passes for camera-safe depth without heaviness.',
                                ]).map((tip: string) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </>
                )}
                {fullAnalysisLoading && (
                  <div className="flex items-center gap-2 text-[#bfa77a]">
                    <div className="w-5 h-5 border-2 border-[#bfa77a] border-t-transparent rounded-full animate-spin"></div>
                    Preparing complexion dossier...
                  </div>
                )}
                {fullAnalysis.error && (
                  <div className="text-red-600 text-sm font-semibold">Error: {fullAnalysis.error}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="mt-3 px-3 py-2 rounded-lg border border-[#e4d5bc] bg-white/80 text-xs text-[#6d4c1e]/85 text-center">
            Capture a photo to unlock the Complexion Dossier.
          </div>
        )}
      </div>
    </div>
  );
};

export default FoundationTryOnInterface;

/*
Features and How It Works:

1. Occasion Selector:
   - Dropdown at the top-left lets the user choose between "Everyday", "Party", and "Professional".
   - Changing the occasion updates the recommended foundation shades.

2. Camera Section:
   - Shows a live video feed from the user's camera.
   - User can capture a photo by clicking the "📸 Capture Photo" button (only visible after a shade is selected).
   - Captured image is sent to the backend to apply the selected foundation shade.

3. Foundation Swatch Panel:
   - Displayed below the camera feed.
   - Shows recommended foundation shades for the selected occasion.
   - User can select a shade; the selected shade is highlighted.
   - The swatch panel is labeled "Swatch Panel".

4. Processed Image Preview:
   - After capturing a photo, the processed image (with foundation applied) is shown below the camera.
   - Includes before/after comparison buttons.

5. Action Buttons:
   - After processing, if a face is detected, user can Save, Share, or Buy the look.

6. Recommended Foundation Details:
   - Panel below the camera section shows details for the selected shade: name, hex, mixing percentages, and live analysis data.

7. Error Handling:
   - Displays error messages if camera access fails or backend processing fails.

8. Modal Overlay:
   - The entire interface is rendered as a modal overlay, blocking the background.

9. No Lipstick Features:
   - No lipstick try-on or palette is present on this screen.

How it works:
- User selects an occasion, which updates the foundation shades.
- User selects a foundation shade from the swatch panel.
- User captures a photo; the image is sent to the backend for processing.
- The processed image is displayed, with options for before/after comparison and further actions.
- Recommended foundation details and live analysis are always visible below the camera/swatch panel.
*/

/*
Feature: Foundation Try-On (Hex Color Only)

Requirements for this feature to work:
- The backend server must be running and accessible at /v1/apply-foundation-mediapipe.
- The backend must support hex color codes for the foundation_color parameter (e.g., "#b08d57").
- MediaPipe FaceMesh must be available in the browser for landmark detection.
- User must grant camera access for live capture.
- The frontend and backend must use the same color format (hex) for foundation application.
- For neural/deep learning foundation (optional): Place a PyTorch model named foundation_style_model.pt in the backend directory.

How it works:
- User selects a foundation shade (hex code).
- User captures a photo.
- The selected hex color and image are sent to the backend for processing.
- The backend applies the foundation using the mask and returns the processed image.
- The frontend displays the processed image to the user.

Troubleshooting:
- If the color does not match, ensure only hex codes are used and backend logic does not convert to RGB.
- If the backend is not running or accessible, the feature will not work.
- If camera access is denied, the user cannot capture a photo.
*/
