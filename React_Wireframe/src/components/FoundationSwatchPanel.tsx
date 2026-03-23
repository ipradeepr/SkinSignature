import React from 'react';
// Use 'any' for swatch type for compatibility
interface FoundationSwatchPanelProps {
  foundationSwatches: any[];
  selectedFoundation: any;
  onSelect: (swatch: any) => void;
  isApplying: boolean;
}

const FoundationSwatchPanel: React.FC<FoundationSwatchPanelProps> = ({ foundationSwatches, selectedFoundation, onSelect, isApplying }) => (
  <div className="mt-4">
    {/* Move label inside the modal/overlay, not outside */}
    <h4 className="font-semibold mb-3 text-center lux-title text-lg tracking-[0.2em] uppercase">Recommended Foundations</h4>
    <div className="w-full grid grid-cols-2 gap-2">
      {foundationSwatches.map((swatch) => (
        <button
          key={swatch.name}
          className={`relative w-full px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${selectedFoundation?.name === swatch.name ? 'border-[#bfa77a] bg-[#1c1a17] text-[#f7f2ea] -translate-y-0.5 shadow-[0_10px_18px_rgba(28,26,23,0.18)]' : 'border-[#d9c6a4] bg-white/90 text-[#5b4632] hover:-translate-y-0.5'} ${isApplying ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => onSelect(swatch)}
          disabled={isApplying}
        >
          {selectedFoundation?.name === swatch.name && (
            <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#f7f2ea] text-[#1c1a17] border border-[#bfa77a]">
              Selected
            </span>
          )}
          <span className="block w-6 h-6 rounded-full mb-1" style={{ background: swatch.color }}></span>
          {swatch.name}
        </button>
      ))}
    </div>
  </div>
);

export default FoundationSwatchPanel;
// All swatch panel features are present and usable.
// (No changes needed for improved foundation application realism)