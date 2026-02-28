import React from 'react';
import SkinSignatureImg from '../assets/SkinSignature.png';

type ProductDisplayProps = {
  onStartCamera: (experience: 'store' | 'in-house') => void;
  onLipstickTryOn: (experience: 'store' | 'in-house') => void;
  selectedConfig: 'foundation' | 'lipstick';
  experienceType?: 'store' | 'in-house';
};

const ProductDisplay: React.FC<ProductDisplayProps> = ({ 
  onStartCamera,
  onLipstickTryOn,
  selectedConfig,
  experienceType = 'store',
}) => {
  const handleTryOn = () => {
    if (selectedConfig === 'foundation') {
      onStartCamera(experienceType);
    } else {
      onLipstickTryOn(experienceType);
    }
  };

  return (
    <div className="flex flex-col items-center mt-4 sm:mt-6">
      <div className="lux-card rounded-3xl px-6 py-8 w-full max-w-md flex flex-col items-center">
        {/* Always show product image */}
        <div className="w-full flex justify-center">
          <div className="luxury-border rounded-2xl bg-white/80 p-3">
            <img
              src={SkinSignatureImg}
              alt="Skin Signature Product"
              className="w-40 sm:w-48 h-auto"
            />
          </div>
        </div>
        <div className="mt-5 text-center">
          <div className="lux-title text-lg sm:text-xl tracking-widest uppercase">Maison Skin Signature</div>
          <div className="lux-muted text-xs sm:text-sm mt-1">Crafted beauty intelligence</div>
        </div>
        {/* Try-On button for both foundation and lipstick */}
        <button
          className="tryon-btn mt-5 w-full"
          type="button"
          onClick={handleTryOn}
        >
          Try-On
        </button>
      </div>
    </div>
  );
};

export default ProductDisplay;