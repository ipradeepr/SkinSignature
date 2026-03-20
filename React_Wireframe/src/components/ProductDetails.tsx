import React from 'react';
import { Star } from 'lucide-react';

type ProductDetailsProps = {
  selectedConfig: 'foundation' | 'lipstick';
  onConfigChange: (config: 'foundation' | 'lipstick') => void;
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  selectedConfig,
  onConfigChange,
}) => {
  const [hasConfigBeenChanged, setHasConfigBeenChanged] = React.useState(false);

  const handleConfigSelect = (config: 'foundation' | 'lipstick') => {
    if (config !== selectedConfig) {
      setHasConfigBeenChanged(true);
    }
    onConfigChange(config);
  };

  return (
    <div className="flex flex-col space-y-6 sm:space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] lux-muted mb-2">SS2025</div>
        <div className="flex flex-col sm:flex-row sm:items-center mb-4">
          <h1 className="text-2xl sm:text-4xl font-semibold lux-title mb-2 sm:mb-0 sm:mr-4">Skin Signature</h1>
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            ))}
          </div>
        </div>
        <p className="lux-muted text-sm sm:text-base mb-4">
          Real-time AI skin analysis that determines your best-match shade instantly.
        </p>
        <div className="lux-divider" />
  {/* Price removed as requested */}
      </div>

      {/* Product Description */}
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-xl sm:text-2xl font-semibold lux-title mb-3 sm:mb-4">Luxury AI Beauty Intelligence, Now Personalized by Mode</h3>
          <p className="lux-muted leading-relaxed text-sm sm:text-base">
            Skin Signature now adapts to how you shop and apply beauty: In-Store Experience, In-house Experience, and Luxury Standards.
            In real time, AI analyzes your live skin signal—tone, undertone, texture, and lighting—to determine your best-match shades,
            then recommends couture-level foundation and lipstick looks with instantly visualized shade-to-cartridge mapping in Luxury Standards mode.
          </p>
        </div>
        
        <div>
          <p className="lux-muted leading-relaxed text-sm sm:text-base">
            Every session includes a guided Complexion Dossier with confidence-led shade recommendations and closest alternatives,
            so clients can compare options quickly while preserving a premium, consultative experience across both foundation and lipstick try-on.
          </p>
        </div>

        <div>
          <p className="lux-muted leading-relaxed text-sm sm:text-base">
            Matte, satin, and radiant finishes are rendered with improved motion and day/evening material realism,
            and each selected formula can be reserved instantly with a generated reservation reference for seamless follow-through.
          </p>
        </div>
      </div>

      {/* Configuration Selection - Buttons (Updated) */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="font-semibold block lux-title">Configuration</span>
          <span className="lux-pill px-3 py-1 text-xs font-semibold tracking-wide uppercase">
            Selected: {selectedConfig === 'foundation' ? 'Foundation' : 'Lipstick'}
          </span>
        </div>
        <div className="flex gap-2 w-full">
          <button
            className={`main-action-btn config-option-btn flex-1 w-full${selectedConfig === 'foundation' ? ' active' : ''}`}
            type="button"
            onClick={() => handleConfigSelect('foundation')}
            aria-pressed={selectedConfig === 'foundation'}
          >
            {!hasConfigBeenChanged && selectedConfig === 'foundation' && (
              <span className="config-default-badge">Default</span>
            )}
            {selectedConfig === 'foundation' ? '✓ Foundation Selected' : 'Foundation'}
          </button>
          <button
            className={`main-action-btn config-option-btn flex-1 w-full${selectedConfig === 'lipstick' ? ' active' : ''}`}
            type="button"
            onClick={() => handleConfigSelect('lipstick')}
            aria-pressed={selectedConfig === 'lipstick'}
          >
            {!hasConfigBeenChanged && selectedConfig === 'lipstick' && (
              <span className="config-default-badge">Default</span>
            )}
            {selectedConfig === 'lipstick' ? '✓ Lipstick Selected' : 'Lipstick'}
          </button>
        </div>
      </div>

      <div className="text-center">
        <span className="lux-muted font-medium text-sm sm:text-base">
          Contact a Beauty Technology Advisor
        </span>
      </div>

      <div className="text-center text-xs sm:text-sm lux-muted">
        Complimentary Standard Delivery or Collect in Store
        <br />
        Professional Setup & Training Included
      </div>
    </div>
  );
};

export default ProductDetails;