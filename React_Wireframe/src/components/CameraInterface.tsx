import React, { useState, useRef, useEffect } from 'react';
import { SkinAnalysisService } from '../services/skinAnalysisService';

// Utility to capture frame from video element as base64
function getFrameData(videoElement: HTMLVideoElement | null): string {
  if (!videoElement) return '';
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

const CameraInterface: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [selectedOccasion, setSelectedOccasion] = useState('office');
  const [luxuryAnalysis, setLuxuryAnalysis] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Add swatches and mixingPercents here so they're available in JSX
  const swatches = [
    { name: 'Ivory', color: '#f3e5d0' },
    { name: 'Beige', color: '#e1c699' },
    { name: 'Honey', color: '#d4a574' }
  ];

  const mixingPercents = realTimeData?.mixingPercents || { antiAging: 30, foundation: 50, customBlend: 20 };

  // Start camera on mount
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
      }
    }
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, []);

  // Real-time analysis effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const skinAnalysisService = new SkinAnalysisService();

    const analyzeFrame = async () => {
      const frameData = getFrameData(videoRef.current);
      if (frameData) {
        const result = await skinAnalysisService.performRealTimeAnalysis(
          frameData,
          {}, // userLocation (add if needed)
          selectedOccasion
        );
        setRealTimeData(result);
      }
    };
    intervalId = setInterval(analyzeFrame, 2000); // every 2 seconds
    return () => clearInterval(intervalId);
  }, [selectedOccasion]);

  const handleFullAnalysis = async () => {
    setIsLoading(true);
    try {
      const frameData = getFrameData(videoRef.current);
      const skinAnalysisService = new SkinAnalysisService();
      const result = await skinAnalysisService.performFullAnalysis(
        frameData,
        {}, // userLocation (add if needed)
        selectedOccasion,
        realTimeData?.lighting_condition || ''
      );
      setAnalysisResult(result);
      const lux = await skinAnalysisService.performLuxuryFullAnalysis(frameData);
      if (lux.success) setLuxuryAnalysis(lux.analysis);
    } catch {
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 lux-page flex items-start justify-center overflow-y-auto px-4 py-6 sm:py-8">
      <div className="lux-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row w-full max-w-6xl mx-auto gap-6 relative">
        {/* Close Button */}
        {onClose && (
          <button
            className="absolute top-4 right-4 text-[#bfa77a] hover:text-[#6d4c1e] text-3xl font-bold transition"
            onClick={onClose}
            aria-label="Close Camera"
          >
            &#10005;
          </button>
        )}
        {/* Left Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative w-full max-w-md mx-auto luxury-border overflow-hidden rounded-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-64 md:h-80 object-cover"
            />
          </div>
          <div className="mt-6 w-full max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2 text-sm md:text-base">
              <span className="font-semibold text-[#6d4c1e]">Party/Evening</span>
              <span className="font-semibold text-[#6d4c1e]">Reflect</span>
              <span className="font-semibold text-[#6d4c1e]">Medium Full</span>
            </div>
            <input type="range" min={0} max={100} step={1} className="w-full accent-[#bfa77a] transition-all duration-150" />
            <div className="flex justify-between mt-2">
              <button className="lux-pill px-3 py-1 text-xs">Show Before</button>
              <button className="lux-pill px-3 py-1 text-xs">Show After</button>
            </div>
            <button className="main-action-btn mt-4 w-full">Confirm Shade</button>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <span className="lux-pill px-4 py-2 font-semibold">Anti-Aging ({mixingPercents.antiAging}%)</span>
              <span className="lux-pill px-4 py-2 font-semibold">Foundation ({mixingPercents.foundation}%)</span>
              <span className="lux-pill px-4 py-2 font-semibold">Custom Blend ({mixingPercents.customBlend}%)</span>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {swatches.map((swatch) => (
                <span key={swatch.name} className="block w-10 h-10 rounded-full border-2 border-[#bfa77a]" style={{ background: swatch.color }}></span>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <button
                className="main-action-btn"
                onClick={handleFullAnalysis}
                disabled={isLoading}
              >
                {isLoading ? 'Analyzing...' : 'Complexion Dossier'}
              </button>
              <button className="main-action-btn">
                Try On Lipstick
              </button>
            </div>
          </div>
        </div>
        {/* Right Section */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-md mx-auto mb-6">
            <label className="block font-bold mb-2 text-[#6d4c1e]">Occasion</label>
            <select
              className="w-full p-2 rounded-xl border border-[#bfa77a] bg-white text-[#bfa77a] font-semibold shadow focus:outline-none focus:ring-2 focus:ring-[#bfa77a]"
              value={selectedOccasion}
              onChange={e => setSelectedOccasion(e.target.value)}
            >
              <option value="office">Executive Elegance</option>
              <option value="evening">Evening Glamour</option>
              <option value="outdoor">Outdoor Radiance</option>
              <option value="casual">Casual Chic</option>
              <option value="redcarpet">Red Carpet Moment</option>
              <option value="spa">Spa Retreat</option>
              <option value="wedding">Wedding Luxe</option>
              <option value="fashionweek">Fashion Week</option>
              <option value="travel">Jetsetter Glow</option>
              <option value="brunch">Brunch Sophistication</option>
              <option value="gala">Gala Night</option>
              <option value="photoshoot">Photoshoot Perfection</option>
              <option value="launch">Product Launch</option>
              <option value="cocktail">Cocktail Soirée</option>
              <option value="private">Private Event</option>
            </select>
          </div>
          {/* Live Analysis moved here */}
          {realTimeData && (
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="lux-card rounded-xl px-6 py-4">
                <div className="font-bold text-lg text-[#6d4c1e]">Live Analysis</div>
                <div>Skin Index: <span className="font-bold text-[#bfa77a]">{realTimeData.skin_health_score ?? '--'}%</span></div>
                <div>Highlight: <span className="font-bold text-[#bfa77a]">{realTimeData.hydration_level ?? '--'}%</span></div>
                <div>Confidence: <span className="font-bold text-[#bfa77a]">{realTimeData.skin_tone_confidence ?? '--'}%</span></div>
              </div>
            </div>
          )}
          {/* Comprehensive Analysis */}
          {analysisResult && (
            <div className="w-full max-w-md mx-auto">
              <div className="lux-card rounded-2xl p-6">
                <div className="font-bold text-lg text-[#bfa77a] mb-2">Comprehensive Analysis</div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Luxury Category:</span> <span className="ml-2 text-[#bfa77a]">{analysisResult.skin_tone_data?.luxury_category}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Finish:</span> <span className="ml-2 text-[#bfa77a]">{analysisResult.skin_tone_data?.luxury_finish}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Luxury Tip:</span> <span className="ml-2 text-[#bfa77a]">{analysisResult.skin_tone_data?.luxury_tip}</span>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Anti-Aging Compounds:</span>
                  <ul className="list-disc ml-6 text-[#bfa77a]">
                    {(analysisResult.anti_aging_compounds || []).map((compound: string) => (
                      <li key={compound}>{compound}</li>
                    ))}
                  </ul>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Climate Adjustments:</span>
                  <ul className="list-disc ml-6 text-[#bfa77a]">
                    {(analysisResult.climate_adjustments || []).map((adj: string) => (
                      <li key={adj}>{adj}</li>
                    ))}
                  </ul>
                </div>
                <div className="mb-2">
                  <span className="font-semibold text-[#6d4c1e]">Recommendations:</span>
                  <ul className="list-disc ml-6 text-[#bfa77a]">
                    {(analysisResult.recommendations || []).map((rec: string) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          {/* Luxury Analysis */}
          {luxuryAnalysis && (
            <div className="w-full max-w-md mx-auto mt-6">
              <div className="lux-card rounded-xl px-6 py-4">
                <div className="font-bold text-lg text-[#6d4c1e] mb-2">Luxury Live Metrics</div>
                <div className="text-sm space-y-1">
                  <div>Skin Tone Hex: <span className="font-semibold text-[#bfa77a]">{luxuryAnalysis.skin_tone_hex}</span></div>
                  <div>Undertone: <span className="font-semibold text-[#bfa77a]">{luxuryAnalysis.undertone}</span></div>
                  <div>Texture: <span className="font-semibold text-[#bfa77a]">{luxuryAnalysis.texture_score}%</span></div>
                  <div>Evenness: <span className="font-semibold text-[#bfa77a]">{luxuryAnalysis.evenness_score}%</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default CameraInterface;
