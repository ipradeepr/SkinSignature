import React from 'react';

interface LipstickControlsProps {
  selectedLipstick?: any;
  onLipstickSelect?: (shade: any) => void;
}

const LIPSTICK_SHADES = [
  { name: 'Classic Red', hex: '#C72C48' },
  { name: 'Rosewood', hex: '#B76E79' },
  { name: 'Warm Nude', hex: '#D2A679' },
  { name: 'Fuchsia', hex: '#E43F6F' },
  { name: 'Plum', hex: '#7B294E' },
  { name: 'Editorial Deep Plum', hex: '#4B244A' }
];

const LipstickControls: React.FC<LipstickControlsProps> = ({ selectedLipstick, onLipstickSelect }) => (
  <div className="mt-4 sm:mt-6">
    <h4 className="text-base sm:text-lg font-semibold lux-title mb-3 sm:mb-4 flex items-center">
      <span className="mr-2">💄</span> Select Lipstick Shade
    </h4>
    <div className="grid grid-cols-6 gap-2 mb-4">
      {LIPSTICK_SHADES.map((shade) => (
        <button
          key={shade.hex}
          type="button"
          aria-label={`Select ${shade.name}`}
          onClick={() => onLipstickSelect && onLipstickSelect(shade)}
          className={`aspect-square rounded-full border-2 transition-all duration-200 shadow-lg focus:outline-none ${selectedLipstick && selectedLipstick.hex === shade.hex ? 'border-[#bfa77a] scale-110' : 'border-[#f1e7d6] hover:border-[#bfa77a]'}`}
          style={{ backgroundColor: shade.hex }}
        />
      ))}
    </div>
    {selectedLipstick && (
      <div className="text-center mt-2 lux-muted font-semibold text-base animate-fade-in">
        Selected: {selectedLipstick.name}
      </div>
    )}
  </div>
);

export default LipstickControls;
