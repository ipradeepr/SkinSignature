import React from 'react';

interface FoundationControlsProps {
  foundationSwatches: any[];
  selectedFoundation: any;
  onFoundationSelect: (swatch: any) => void;
  onClearFoundation: () => void;
  isAnalyzing: boolean;
  onPerformFullAnalysis: () => void;
}

const FoundationControls: React.FC<FoundationControlsProps> = ({
  foundationSwatches,
  // ...existing code...
  onClearFoundation,
  isAnalyzing,
  onPerformFullAnalysis
}) => {
  return (
    <div>
      {/* Foundation Controls and Swatches - Enhanced Luxury UI - Refined */}
      {/* ...existing foundation controls code... */}
      {/* Camera Controls */}
      <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-6">
        <button
          onClick={onPerformFullAnalysis}
          disabled={isAnalyzing}
          className="main-action-btn disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full mr-2 sm:mr-3"></div>
              Analyzing...
            </>
          ) : (
            <>
              {/* Icon can be added here */}
              Complexion Dossier
            </>
          )}
        </button>
        {foundationSwatches.length > 0 && (
          <button
            onClick={onClearFoundation}
            className="lux-pill px-4 sm:px-6 py-2 sm:py-3 font-semibold flex items-center justify-center text-sm sm:text-base"
          >
            {/* Icon can be added here */}
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default FoundationControls;
