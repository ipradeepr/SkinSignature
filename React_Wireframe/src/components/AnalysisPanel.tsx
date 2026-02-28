import React from 'react';

interface AnalysisPanelProps {
  analysisResult?: any;
  lipstickMode?: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysisResult, lipstickMode }) => {
  if (!analysisResult || lipstickMode) return null;
  return (
    <div className="lux-card rounded-2xl p-6 mt-6">
      <h4 className="font-semibold text-xl lux-title mb-4 flex items-center gap-2">
        <span className="inline-block w-6 h-6 rounded-full bg-[#1c1a17] flex items-center justify-center mr-2 border border-[#bfa77a]">
          {/* Icon can be added here */}
        </span>
        Comprehensive Analysis
      </h4>
      <div className="space-y-3 text-base">
        {/* ...existing analysis result UI... */}
      </div>
    </div>
  );
};

export default AnalysisPanel;
