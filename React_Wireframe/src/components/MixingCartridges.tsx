import React from 'react';

interface MixingCartridgesProps {
  mixingPercents: { antiAging: number; foundation: number; customBlend: number };
  isMixing: boolean;
}

const MixingCartridges: React.FC<MixingCartridgesProps> = ({ mixingPercents, isMixing }) => (
  <div className="flex justify-center items-end gap-10 mt-8 mb-4">
    {/* Cartridge 1: Anti-aging - Single Luxury Color */}
    <div className="relative flex flex-col items-center">
      <div className="w-14 h-32 rounded-3xl border-2 border-[#bfa77a] flex items-end overflow-hidden"
        style={{ background: 'rgba(191,167,122,0.18)', boxShadow: '0 6px 20px rgba(191,167,122,0.25)', backdropFilter: 'blur(8px)', position: 'relative' }}>
        {/* Fill animation */}
        <div className="w-full rounded-b-3xl"
          style={{ height: isMixing ? `${mixingPercents.antiAging}%` : '0%', background: '#7a664a', boxShadow: '0 0 12px rgba(122,102,74,0.45)', transition: 'height 2s cubic-bezier(.4,2,.6,1)' }}></div>
        {/* Shine effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '30%', background: 'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))', borderRadius: 'inherit' }}></div>
      </div>
      <span className="mt-2 text-sm font-semibold lux-title tracking-wide">Anti-Aging</span>
      {isMixing && <span className="text-xs lux-muted font-semibold">{mixingPercents.antiAging}%</span>}
    </div>
    {/* Cartridge 2: Foundation - Gold Luxury, Single Color */}
    <div className="relative flex flex-col items-center">
      <div className="w-14 h-32 rounded-3xl border-2 border-[#bfa77a] flex items-end overflow-hidden"
        style={{ background: 'rgba(191,167,122,0.2)', boxShadow: '0 6px 20px rgba(191,167,122,0.25)', backdropFilter: 'blur(8px)', position: 'relative' }}>
        {/* Fill animation */}
        <div className="w-full rounded-b-3xl"
          style={{ height: isMixing ? `${mixingPercents.foundation}%` : '0%', background: '#bfa77a', boxShadow: '0 0 12px rgba(191,167,122,0.6)', transition: 'height 2s cubic-bezier(.4,2,.6,1)' }}></div>
        {/* Shine effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '30%', background: 'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))', borderRadius: 'inherit' }}></div>
      </div>
      <span className="mt-2 text-sm font-semibold lux-title tracking-wide">Foundation</span>
      {isMixing && <span className="text-xs lux-muted font-semibold">{mixingPercents.foundation}%</span>}
    </div>
    {/* Cartridge 3: Custom Blend - Single Luxury Color */}
    <div className="relative flex flex-col items-center">
      <div className="w-14 h-32 rounded-3xl border-2 border-[#bfa77a] flex items-end overflow-hidden"
        style={{ background: 'rgba(191,167,122,0.15)', boxShadow: '0 6px 20px rgba(191,167,122,0.22)', backdropFilter: 'blur(8px)', position: 'relative' }}>
        {/* Fill animation */}
        <div className="w-full rounded-b-3xl"
          style={{ height: isMixing ? `${mixingPercents.customBlend}%` : '0%', background: '#a98954', boxShadow: '0 0 12px rgba(169,137,84,0.55)', transition: 'height 2s cubic-bezier(.4,2,.6,1)' }}></div>
        {/* Shine effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '30%', background: 'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))', borderRadius: 'inherit' }}></div>
      </div>
      <span className="mt-2 text-sm font-semibold lux-title tracking-wide">Custom Blend</span>
      {isMixing && <span className="text-xs lux-muted font-semibold">{mixingPercents.customBlend}%</span>}
    </div>
  </div>
);

export default MixingCartridges;
