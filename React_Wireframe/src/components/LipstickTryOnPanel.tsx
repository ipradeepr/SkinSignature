import React from 'react';

interface LipstickTryOnPanelProps {
  lipstickMode: boolean;
  selectedLipstick: { name: string; hex: string } | null;
  onTryOn: () => void;
  realTimeData: any;
}

const LipstickTryOnPanel: React.FC<LipstickTryOnPanelProps> = ({ lipstickMode, selectedLipstick, onTryOn, realTimeData }) => (
  <div className="mt-4">
    <button
      className="main-action-btn"
      onClick={onTryOn}
    >
      Try On Lipstick
    </button>
    {lipstickMode && selectedLipstick && (
      <div className="mt-3 flex items-center gap-2 lux-card rounded-xl px-4 py-2">
        <span className="block w-6 h-6 rounded-full border border-[#bfa77a]" style={{ background: selectedLipstick.hex }}></span>
        <span className="font-semibold lux-title text-sm">{selectedLipstick.name}</span>
      </div>
    )}
    {lipstickMode && realTimeData && (
      <div className="mt-2 text-sm lux-muted">
        <span>Skin Tone: {realTimeData.current_tone}</span>
      </div>
    )}
    {lipstickMode && selectedLipstick && (
      <LipstickOverlay selectedLipstick={selectedLipstick} />
    )}
  </div>
);

const LipstickOverlay: React.FC<{ selectedLipstick: { hex: string } }> = ({ selectedLipstick }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  // Remove unused state setter
  const [detections] = React.useState<any>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    // Add null checks for canvas
    if (!ctx || !canvas) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // In your lipstick overlay drawing logic:
    const lips = detections.landmarks.getMouth();
    // Use all points for the lip mask, not just innerLips
    if (ctx && lips.length > 0) {
      ctx.save();
      ctx.beginPath();
      lips.forEach((point: any, idx: number) => {
        if (idx === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      // Use a gradient for more natural blending
      const lipGradient = ctx.createLinearGradient(
        lips[0].x,
        lips[0].y,
        lips[8].x,
        lips[8].y
      );
      lipGradient.addColorStop(0, selectedLipstick.hex);
      lipGradient.addColorStop(1, '#fff0');
      ctx.fillStyle = lipGradient;
      ctx.globalAlpha = 0.65;
      ctx.filter = 'blur(1.2px)';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.filter = 'none';
      ctx.restore();
    }
  }, [detections, selectedLipstick]);

  return <canvas ref={canvasRef} className="absolute inset-0" />;
};

export default LipstickTryOnPanel;