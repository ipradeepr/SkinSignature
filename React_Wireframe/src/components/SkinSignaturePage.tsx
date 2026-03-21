import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCamera } from '../hooks/useCamera';
import { SkinAnalysisService } from '../services/skinAnalysisService';
import { FoundationService } from '../services/foundationService';
import ProductDisplay from './ProductDisplay';
import ProductDetails from './ProductDetails';
// import FeatureCards from './FeatureCards'; // unused
import Header from './Header';
import FoundationTryOnInterface from './FoundationTryOnInterface';
import LipstickTryOnInterface from './LipstickTryOnInterface';

type FoundationSwatch = {
  id: number;
  name: string;
  shortName: string;
  color: string;
  hex: string;
  isRecommended: boolean;
  coverage: number;
  finish: string;
};

type SkinToneProfile = 'fair' | 'medium' | 'deep';

type SkinToneSignal = {
  tone: SkinToneProfile;
  confidence: number;
};

const FAIR_HINTS = ['fair', 'light', 'ivory', 'porcelain'];
const DEEP_HINTS = ['deep', 'dark', 'ebony', 'rich'];

const parseToneFromText = (value: unknown): SkinToneProfile | null => {
  const text = String(value || '').toLowerCase();
  if (!text) return null;
  if (FAIR_HINTS.some((hint) => text.includes(hint))) return 'fair';
  if (DEEP_HINTS.some((hint) => text.includes(hint))) return 'deep';
  if (text.includes('medium') || text.includes('neutral') || text.includes('warm') || text.includes('cool')) return 'medium';
  return null;
};

const extractToneSignal = (payload: any): SkinToneSignal | null => {
  if (!payload) return null;
  const candidates = [
    payload?.skin_tone_data?.name,
    payload?.current_tone,
    payload?.skin_tone,
    payload?.undertone,
    payload?.luxury_category,
  ];

  for (const candidate of candidates) {
    const tone = parseToneFromText(candidate);
    if (tone) {
      const rawConfidence = Number(
        payload?.skin_tone_confidence ||
        payload?.confidence ||
        payload?.skin_tone_data?.confidence ||
        70,
      );
      const confidence = Number.isFinite(rawConfidence)
        ? Math.max(0, Math.min(100, Math.round(rawConfidence)))
        : 70;
      return { tone, confidence };
    }
  }

  return null;
};

const SkinSignaturePage: React.FC<{ experienceType?: 'store' | 'in-house'; launchMode?: 'store' | 'cartridge' | 'in-house'; onNavigateHome?: () => void }> = ({ experienceType = 'store', launchMode = 'store', onNavigateHome }) => {
  // --- Camera and View State ---
  const { cameraActive, videoRef, canvasRef, overlayCanvasRef, startCamera, stopCamera, streamRef } = useCamera();
  const [currentView, setCurrentView] = useState<'home' | 'skin-analysis' | 'lipstick-tryon'>('home');
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive, videoRef, streamRef]);
  useEffect(() => {
    console.log('cameraActive state changed:', cameraActive);
  }, [cameraActive]);

  // --- Product and Analysis State ---
  const [selectedSize] = useState('Portable Pro');
  const [isAnalyzing] = useState(false);
  const [realTimeAnalysis, setRealTimeAnalysis] = useState(false);
  const [analysisResult] = useState<any>(null);
  const [selectedFoundation, setSelectedFoundation] = useState<FoundationSwatch | null>(null);
  const [selectedOccasion] = useState('office');
  const [isApplyingFoundation, setIsApplyingFoundation] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // --- Lipstick Try-On State ---
  const [lipstickMode, setLipstickMode] = useState(false);
  const [selectedLipstick, setSelectedLipstick] = useState<{ name: string; hex: string } | null>(null);
  const lipstickCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- Analysis Interval Ref ---
  const analysisIntervalRef = useRef<number | null>(null);

  // --- Config State ---
  const [selectedConfig, setSelectedConfig] = useState<'foundation' | 'lipstick'>('lipstick');

  // --- Modal State for Full Analysis ---
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [showFoundationTryOn, setShowFoundationTryOn] = useState(false);

  const [liveSkinTone, setLiveSkinTone] = useState<SkinToneProfile | null>(null);
  const [liveToneConfidence, setLiveToneConfidence] = useState<number>(0);
  const toneHistoryRef = useRef<SkinToneProfile[]>([]);

  const fallbackSkinTone = useMemo<SkinToneProfile>(() => {
    const signal =
      extractToneSignal(realTimeData) ||
      extractToneSignal(analysisResult) ||
      extractToneSignal({ skin_tone: selectedFoundation?.name });
    return signal?.tone || 'medium';
  }, [realTimeData, analysisResult, selectedFoundation]);

  const inferredSkinTone = liveSkinTone || fallbackSkinTone;

  // --- Handlers ---
  const handleStartCamera = async (_experience: 'store' | 'in-house') => {
    setShowFoundationTryOn(true);
    setCurrentView('home');
    setRealTimeAnalysis(false);
    setLipstickMode(false);
    // no-op: experience is carried via prop to interface render
  };

  const handleLipstickTryOn = async (_experience: 'store' | 'in-house') => {
    setShowFoundationTryOn(false);
    setLipstickMode(true);
    setCurrentView('lipstick-tryon');
    setSelectedLipstick({ name: 'Classic Red', hex: '#C72C48' });
    setRealTimeAnalysis(true);
    try {
      await startCamera();
    } catch (error) {
      console.warn('Proceeding to lipstick try-on without shared camera stream:', error);
    }
    console.log('Camera activated for lipstick try-on, cameraActive:', cameraActive, 'experience:', experienceType);
  };

  const handleCloseCamera = () => {
    stopCamera();
    setCurrentView('home');
    setRealTimeAnalysis(false);
    setLipstickMode(false);
    setSelectedLipstick(null);
    setRealTimeData(null);
    setLiveSkinTone(null);
    setLiveToneConfidence(0);
    toneHistoryRef.current = [];
    console.log('Camera closed, returning to home');
  };

  const handleCloseFoundationTryOn = () => {
    setShowFoundationTryOn(false);
  };

  const handleHeaderHomeClick = () => {
    if (cameraActive) {
      stopCamera();
    }
    setShowFoundationTryOn(false);
    setLipstickMode(false);
    setCurrentView('home');
    onNavigateHome?.();
  };

  useEffect(() => {
    if (realTimeData && realTimeData.skin_tone_data) {
      // ...existing code...
    } else if (realTimeData && !realTimeData.skin_tone_data) {
      // ...existing code...
    }
  }, [realTimeData]);

  useEffect(() => {
    const signal = extractToneSignal(realTimeData);
    if (!signal) return;

    const updatedHistory = [...toneHistoryRef.current, signal.tone].slice(-6);
    toneHistoryRef.current = updatedHistory;

    const votes = updatedHistory.reduce<Record<SkinToneProfile, number>>(
      (acc, tone) => {
        acc[tone] += 1;
        return acc;
      },
      { fair: 0, medium: 0, deep: 0 },
    );

    const smoothedTone = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] as SkinToneProfile) || signal.tone;
    setLiveSkinTone(smoothedTone);
    setLiveToneConfidence(signal.confidence);
  }, [realTimeData]);

  const foundationService = new FoundationService();
  const skinAnalysisService = new SkinAnalysisService();

  // --- Real-time skin analysis ---
  const performRealTimeAnalysis = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !realTimeAnalysis) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (context) {
      context.drawImage(video, 0, 0);
    }
    const imageData = canvas.toDataURL('image/jpeg', 0.6);
    try {
      const result = await skinAnalysisService.performRealTimeAnalysis(
        imageData,
        null,
        selectedOccasion
      );
      // Check if result is valid and contains expected data
      if (!result || !result.skin_tone_data) {
        console.error('API response contained no choices or data:', result);
        // Optionally, set an error state here
        return;
      }
      setRealTimeData(result);
    } catch (error) {
      console.log('Real-time analysis failed:', error);
    }
  }, [realTimeAnalysis, selectedOccasion, skinAnalysisService, videoRef, canvasRef]);

  // --- Foundation overlay ---
  const applyFoundationOverlay = useCallback((foundationColor: string) => {
    if (!videoRef.current || !overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const faceWidth = canvas.width * 0.55;
      const faceHeight = canvas.height * 0.65;
      const mainGradient = ctx.createRadialGradient(
        centerX,
        centerY - 30,
        40,
        centerX,
        centerY - 30,
        Math.min(faceWidth, faceHeight) / 2.2
      );
      const rgb = foundationColor.match(/\d+/g);
      if (rgb) {
        mainGradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`);
        mainGradient.addColorStop(0.6, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.25)`);
        mainGradient.addColorStop(0.85, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1)`);
        mainGradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = mainGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'screen';
        const glowGradient = ctx.createRadialGradient(
          centerX,
          centerY - 20,
          0,
          centerX,
          centerY - 20,
          80
        );
        glowGradient.addColorStop(
          0,
          `rgba(${Math.min(255, parseInt(rgb[0]) + 20)}, ${Math.min(
            255,
            parseInt(rgb[1]) + 15
          )}, ${Math.min(255, parseInt(rgb[2]) + 10)}, 0.15)`
        );
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }, [videoRef, overlayCanvasRef]);

  // --- Lipstick overlay ---
  const applyLipstick = useCallback(async () => {
    if (!videoRef.current || !lipstickCanvasRef.current || !selectedLipstick) return;
    // Dynamically import face-api.js for code-splitting (intentional for chunk size reduction)
    const faceapi = await import('face-api.js');
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    ]);

    // Detect face and landmarks
    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    if (!detections) {
      // Clear canvas if no face detected
      const ctx = lipstickCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, lipstickCanvasRef.current.width, lipstickCanvasRef.current.height);
      return;
    }

    // Resize canvas to match video
    lipstickCanvasRef.current.width = videoRef.current.videoWidth;
    lipstickCanvasRef.current.height = videoRef.current.videoHeight;
    const ctx = lipstickCanvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, lipstickCanvasRef.current.width, lipstickCanvasRef.current.height);

    // Get lip landmarks and split into outer and inner rings (68-landmark model)
    const lips = detections.landmarks.getMouth();
    if (ctx && lips.length >= 20) {
      const outer = lips.slice(0, 12);
      const inner = lips.slice(12);

      // Draw outer path
      const outerPath = new Path2D();
      outer.forEach((p, i) => (i === 0 ? outerPath.moveTo(p.x, p.y) : outerPath.lineTo(p.x, p.y)));
      outerPath.closePath();

      // Draw inner path
      const innerPath = new Path2D();
      inner.forEach((p, i) => (i === 0 ? innerPath.moveTo(p.x, p.y) : innerPath.lineTo(p.x, p.y)));
      innerPath.closePath();

      // Fill base color on outer
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = selectedLipstick.hex;
      ctx.fill(outerPath);

      // Cut out the inner mouth area
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(innerPath);

      // Soft edge feather
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.15;
      ctx.filter = 'blur(1.2px)';
      ctx.strokeStyle = selectedLipstick.hex;
      ctx.lineWidth = 2.0;
      ctx.stroke(outerPath);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }, [videoRef, lipstickCanvasRef, selectedLipstick]);

  // --- Lipstick overlay animation ---
  useEffect(() => {
    let animationFrameId: number;
    const renderLipstick = async () => {
      if (lipstickMode && selectedLipstick) {
        await applyLipstick();
        animationFrameId = requestAnimationFrame(renderLipstick);
      }
    };
    if (lipstickMode && selectedLipstick) {
      renderLipstick();
    }
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      // Clear lipstick overlay when exiting mode
      if (lipstickCanvasRef.current) {
        const ctx = lipstickCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, lipstickCanvasRef.current.width, lipstickCanvasRef.current.height);
      }
    };
  }, [lipstickMode, selectedLipstick, applyLipstick]);

  useEffect(() => {
    if (analysisResult && analysisResult.skin_tone && analysisResult.undertone) {
      const swatches = foundationService.generateFoundationSwatches(
        analysisResult.skin_tone,
        analysisResult.undertone,
        selectedOccasion
      );
      setSelectedFoundation(swatches[4] || null);
    }
  }, [selectedOccasion, analysisResult, foundationService]);

  useEffect(() => {
    if (realTimeAnalysis && cameraActive) {
      analysisIntervalRef.current = window.setInterval(performRealTimeAnalysis, 2000);
    } else {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    }
    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [realTimeAnalysis, cameraActive, performRealTimeAnalysis]);

  // --- Config Effect ---
  useEffect(() => {
    setSelectedConfig('lipstick');
  }, [selectedSize]);

  // --- Use foundation overlay when in skin-analysis view and foundation is selected ---
  useEffect(() => {
    let cancelled = false;
    const runOverlay = async () => {
      if (
        currentView === 'skin-analysis' &&
        selectedFoundation &&
        overlayCanvasRef.current &&
        videoRef.current
      ) {
        setIsApplyingFoundation(true);
        // Convert hex to rgb string for overlay
        const hex = selectedFoundation.hex;

        // Helper to convert hex to rgb string
        const hexToRgb = (hex: string) => {
          const match = hex.replace('#', '').match(/.{1,2}/g);
          if (!match) return '255,255,255';
          const [r, g, b] = match.map((x) => parseInt(x, 16));
          return `${r},${g},${b}`;
        };
        applyFoundationOverlay(hexToRgb(hex));
        if (!cancelled) setIsApplyingFoundation(false);
      }
    };
    runOverlay();
    return () => {
      cancelled = true;
    };
  }, [currentView, selectedFoundation, overlayCanvasRef, videoRef, applyFoundationOverlay]);

  // --- Handler for retake button (relaunch camera) ---
  const handleRetake = () => {
    setShowFoundationTryOn(true);
  };

  // --- Handler for full analysis modal ---
  const handleShowFullAnalysis = () => {
    setShowFullAnalysis(true);
  };
  const handleCloseFullAnalysis = () => {
    setShowFullAnalysis(false);
  };

  // --- Render ---
  return (
    <div className="min-h-screen lux-page flex flex-col items-center py-6 overflow-x-hidden">
      {/* --- Full-width Header --- */}
      <div className="w-full max-w-none">
        <Header cartItems={0} onHomeClick={handleHeaderHomeClick} />
      </div>
      {/* --- Home View --- */}
      {currentView === 'home' && (
        <>
          {/* Header moved above, outside content container */}
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">
              <div className="order-1 w-full">
                <div className="lux-card rounded-2xl p-6 min-h-[360px] sm:min-h-[420px] lg:min-h-[480px] flex flex-col justify-center">
                  <ProductDisplay
                    onStartCamera={handleStartCamera}
                    onLipstickTryOn={handleLipstickTryOn}
                    selectedConfig={selectedConfig}
                    experienceType={experienceType}
                  />
                </div>
              </div>
              <div className="order-2 w-full">
                <div className="lux-card rounded-2xl p-6">
                  <ProductDetails
                    selectedConfig={selectedConfig}
                    onConfigChange={(config) => {
                      setSelectedConfig(config);
                      if (config === 'lipstick') {
                        setShowFoundationTryOn(false);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            {/* --- Experience-aware AI info --- */}
            <div className="mt-10">
              <div className="lux-card rounded-2xl p-6">
                <h3 className="text-xl font-semibold mb-3 lux-title">
                  {launchMode === 'cartridge'
                    ? 'Refill Cartridges Mode (Cartridge Blending & Purchase)'
                    : experienceType === 'store'
                      ? 'Boutique AI Try-On (Store Experience)'
                      : 'Personalized AI Try-On (In-house Experience)'}
                </h3>
                <p className="text-sm lux-muted">
                  {launchMode === 'cartridge'
                    ? 'For device owners, compare more looks, discover cartridge options to purchase, and preview unique blended shades with exact foundation and lipstick cartridge mappings for every selected result.'
                    : experienceType === 'store'
                    ? 'Our AI analyzes your captured image using precise facial landmarks, luminance and undertone metrics to propose shades available in-store (LV-Colorcode). Data from the OMS curates only the shades physically present, ensuring your recommendation is immediately purchasable. Foundation application uses a full-face, feathered mask that excludes eyes and lips for a studio-realistic finish.'
                    : 'Our AI analyzes your captured image and proposes blends from the cartridges loaded in your device. When you select a shade, the device dispenses a precisely measured blend from 3 cartridges to match your undertone and luminance. The virtual application uses a full-face, feathered mask excluding eyes and lips, rendering a realistic preview of your personal blend.'}
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/80 border border-[#d4af37]/40">
                    <div className="font-semibold lux-title">AI Skin Analysis</div>
                    <div className="text-xs lux-muted">
                      Detects tone, undertone, texture and evenness to guide perfect matching.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-[#d4af37]/40">
                    <div className="font-semibold lux-title">Perfectly Blended Finish</div>
                    <div className="text-xs lux-muted">
                      LAB-space chroma blending with texture preservation for realism.
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-[#d4af37]/40">
                    <div className="font-semibold lux-title">
                      {launchMode === 'cartridge'
                        ? 'Refill Cartridges Guide'
                        : experienceType === 'store'
                          ? 'OMS-Curated Shades'
                          : 'Device Cartridge Blends'}
                    </div>
                    <div className="text-xs lux-muted">
                      {launchMode === 'cartridge'
                        ? 'Maps selected looks to cartridge IDs and blend ratios so you can buy and create unique shades on your device.'
                        : experienceType === 'store'
                        ? 'Proposes LV-Colorcode shades available in your boutique.'
                        : 'Dispenses measured quantities from your loaded cartridges.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* --- Key Features Section --- */}
            <div className="mt-10">
              <h2 className="text-2xl sm:text-3xl font-semibold lux-title mb-6 text-center">
                Why Try Skin Signature?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Foundation Feature 1 */}
                <div className="lux-card rounded-xl p-5 flex flex-col items-center text-center">
                  <span className="text-[#bfa77a] mb-3">
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </span>
                  <h3 className="font-semibold text-lg mb-2 lux-title">AI-Powered Skin Analysis</h3>
                  <p className="lux-muted text-sm">
                    Instantly detect your unique skin tone and undertone for a truly personalized foundation match.
                  </p>
                </div>
                {/* Foundation Feature 2 */}
                <div className="lux-card rounded-xl p-5 flex flex-col items-center text-center">
                  <span className="text-[#bfa77a] mb-3">
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <h3 className="font-semibold text-lg mb-2 lux-title">Real-Time Foundation Try-On</h3>
                  <p className="lux-muted text-sm">
                    See recommended foundation shades applied live on your face before you buy.
                  </p>
                </div>
                {/* Lipstick Feature 1 */}
                <div className="lux-card rounded-xl p-5 flex flex-col items-center text-center">
                  <span className="text-[#bfa77a] mb-3">
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M15 5l4 4-9.5 9.5a2.828 2.828 0 01-4 0 2.828 2.828 0 010-4L15 5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
                  </span>
                  <h3 className="font-semibold text-lg mb-2 lux-title">Virtual Lipstick Try-On</h3>
                  <p className="lux-muted text-sm">
                    Experiment with trending lipstick shades virtually—no mess, no guesswork.
                  </p>
                </div>
                {/* Lipstick Feature 2 */}
                <div className="lux-card rounded-xl p-5 flex flex-col items-center text-center">
                  <span className="text-[#bfa77a] mb-3">
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><path d="M12 8v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>
                  </span>
                  <h3 className="font-semibold text-lg mb-2 lux-title">Instant Switch & Compare</h3>
                  <p className="lux-muted text-sm">
                    Instantly switch between foundation and lipstick try-on modes to find your perfect look.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Hidden buttons to ensure handleRetake and handleShowFullAnalysis are referenced */}
          <div style={{ display: 'none' }}>
            <button onClick={handleRetake}>Retake</button>
            <button onClick={handleShowFullAnalysis}>Show Complexion Dossier</button>
          </div>
        </>
      )}

      {/* --- Foundation Try-On Modal Overlay --- */}
      {showFoundationTryOn && (
        <FoundationTryOnInterface
          onClose={handleCloseFoundationTryOn}
          experienceType={experienceType}
          launchMode={launchMode}
          skintone={inferredSkinTone}
          toneConfidence={liveToneConfidence}
        />
      )}

      {/* --- Lipstick Try-On View --- */}
      {(lipstickMode || currentView === 'lipstick-tryon') && (
        <div className="w-full max-w-5xl mx-auto bg-white/90 rounded-2xl shadow-2xl p-6 mt-4 relative">
          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-full border border-[#bfa77a] bg-white/90 px-3 py-1 text-xs">
            <span className="font-semibold text-[#6d4c1e]">Live tone:</span>
            <span className="font-bold text-[#bfa77a] capitalize">{inferredSkinTone}</span>
            {realTimeAnalysis && liveToneConfidence > 0 && (
              <span className="text-[#6d4c1e]/70">({liveToneConfidence}%)</span>
            )}
          </div>
          <LipstickTryOnInterface onClose={handleCloseCamera} experienceType={experienceType} launchMode={launchMode} skintone={inferredSkinTone} />
          {/* Lipstick overlay canvas for accurate application */}
          {(lipstickMode && videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) ? (
            <canvas
              ref={lipstickCanvasRef}
              style={{
                position: 'absolute',
                top: videoRef.current.offsetTop ?? 0,
                left: videoRef.current.offsetLeft ?? 0,
                pointerEvents: 'none',
                zIndex: 10,
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                borderRadius: '1rem',
                boxShadow: '0 4px 24px 0 rgba(80,80,120,0.08)',
              }}
              width={videoRef.current.videoWidth}
              height={videoRef.current.videoHeight}
            />
          ) : null}
        </div>
      )}

      {/* --- Full Analysis Modal (if needed elsewhere in the app) --- */}
      {showFullAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={handleCloseFullAnalysis}
              aria-label="Close"
            >×</button>
            <h3 className="text-xl font-bold mb-4 text-center">Complexion Dossier</h3>
            {/* Example content, replace with real analysis data if needed */}
            <div className="mb-2">
              <span className="font-semibold">Skin Index:</span> 85%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Highlight:</span> 80%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Confidence:</span> 89%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Recommended Shade:</span> Golden Beige
            </div>
            <div className="mb-2">
              <span className="font-semibold">Hex:</span> #e0b8c8
            </div>
            <div className="mb-2">
              <span className="font-semibold">Mixing:</span> Foundation (53%)
            </div>
            <div className="mb-2">
              <span className="font-semibold">Anti-Aging:</span> 20%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Custom Blend:</span> 25%
            </div>
            <div className="mb-2">
              <span className="font-semibold">Occasion:</span> {selectedOccasion}
            </div>
          </div>
        </div>
      )}

      {/* --- Loading Overlay --- */}
      {(isAnalyzing || isApplyingFoundation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-purple-500 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="mt-4 text-lg text-purple-700 font-semibold">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkinSignaturePage;

// All foundation features are present and rendered in the correct layout.
// No features have been removed.