import React, { useState } from 'react';

const occasionOptions = [
  { value: 'casual', label: 'Casual' },
  { value: 'party', label: 'Party' },
  { value: 'office', label: 'Office' },
];

const colorPalettes: Record<string, { name: string; color: string }[]> = {
  casual: [
    { name: 'Peach Nude', color: '#f7b7a3' },
    { name: 'Soft Pink', color: '#f8cdd2' },
    { name: 'Coral Bliss', color: '#ff7f7f' },
    { name: 'Rose Gold', color: '#e8b4b8' },
    { name: 'Warm Taupe', color: '#d2b1a3' },
    { name: 'Champagne', color: '#f7e7ce' },
  ],
  party: [
    { name: 'Classic Red', color: '#c1272d' },
    { name: 'Berry Crush', color: '#a80038' },
    { name: 'Plum Night', color: '#6d214f' },
    { name: 'Ruby Luxe', color: '#9b111e' },
    { name: 'Goldie Red', color: '#d4af37' },
    { name: 'Velvet Cherry', color: '#a52a2a' },
  ],
  office: [
    { name: 'Rosewood', color: '#b76e79' },
    { name: 'Muted Mauve', color: '#b9939a' },
    { name: 'Warm Taupe', color: '#d2b1a3' },
    { name: 'Beige Tribute', color: '#f5f5dc' },
    { name: 'Mildred Rosewood', color: '#c08081' },
    { name: 'Sand', color: '#e2cfc3' },
  ],
};

const luxurySuggestions: Record<string, Record<string, string[]>> = {
  fair: {
    casual: ['LV Nude Lavalliere', 'LV Urban Beige', 'LV Rose Adrienne'],
    party: ['LV Cherry Lush', 'LV Goldie Red', 'LV Rouge 999'],
    office: ['LV Sand Veil', 'LV Pensive Plum', 'LV Beige Tribute'],
  },
  medium: {
    casual: ['LV Be Dior', 'LV Corail Shine', 'LV Blaze of Noon'],
    party: ['LV Scarlet Rouge', 'LV Pirate Rouge', 'LV Red Smile'],
    office: ['LV Sultan Rose', 'LV Rose Stiletto', 'LV Mildred Rosewood'],
  },
  deep: {
    casual: ['LV Argentina Rose', 'LV Jean Cocoa', 'LV Black Tie'],
    party: ['LV Velvet Cherry', 'LV Le Rouge', 'LV Ambitious Rouge'],
    office: ['LV Drama Matte', 'LV Janet Rust', 'LV Rouge Noir'],
  },
};

const LipstickOverlay: React.FC<{ skintone?: 'fair' | 'medium' | 'deep' }> = ({ skintone = 'medium' }) => {
  const [selectedOccasion, setSelectedOccasion] = useState(occasionOptions[0].value);

  return (
    <div className="lux-card rounded-3xl p-8 max-w-xl mx-auto my-8">
      <h2 className="lux-title text-2xl text-center tracking-[0.2em] uppercase mb-6">
        Lipstick Color Palette
      </h2>
      <div className="mb-6 flex justify-center items-center">
        <label htmlFor="occasion-select" className="font-semibold lux-muted mr-2 text-sm sm:text-base">
          Occasion:
        </label>
        <select
          id="occasion-select"
          value={selectedOccasion}
          onChange={e => setSelectedOccasion(e.target.value)}
          className="border border-[#bfa77a] rounded-lg px-4 py-2 bg-white/90 text-[#5b4632] font-medium shadow"
        >
          {occasionOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-4 justify-center">
        {colorPalettes[selectedOccasion].map(({ name, color }) => (
          <div
            key={name}
            className="flex flex-col items-center lux-card rounded-2xl px-3 py-4"
          >
            <div
              className="w-12 h-12 rounded-full border-2 mb-3 shadow-md"
              style={{
                background: color,
                borderColor: '#bfa77a',
                boxShadow: '0 2px 8px rgba(191, 161, 106, 0.18)'
              }}
            />
            <span className="font-semibold lux-muted text-sm text-center">{name}</span>
          </div>
        ))}
      </div>
      <div className="lux-card rounded-2xl p-6">
        <div className="font-semibold lux-title text-lg mb-4">
          Luxury Brand Suggestions
        </div>
        <ul className="lux-muted text-sm leading-relaxed ml-4">
          {luxurySuggestions[skintone][selectedOccasion].map((suggestion) => (
            <li key={suggestion}>• {suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LipstickOverlay;