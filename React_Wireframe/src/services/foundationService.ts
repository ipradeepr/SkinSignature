import { occasions } from '../data/skinData';

export class FoundationService {
  
  generateFoundationSwatches(skinTone: string, undertone: string, occasion: string) {
    const baseColors = {
      'Fair': { r: 245, g: 225, b: 215 },
      'Light': { r: 235, g: 205, b: 185 },
      'Medium': { r: 205, g: 165, b: 135 },
      'Deep': { r: 155, g: 105, b: 85 }
    };

    const undertoneAdjustments = {
      'Cool': { r: -8, g: 3, b: 8 },
      'Neutral': { r: 0, g: 0, b: 0 },
      'Warm': { r: 12, g: 3, b: -3 }
    };

    const occasionAdjustments = {
      'office': { coverage: 0.8, luminosity: 0.6 },
      'wedding': { coverage: 1.0, luminosity: 0.9 },
      'party': { coverage: 0.9, luminosity: 1.0 },
      'casual': { coverage: 0.6, luminosity: 0.7 },
      'outdoor': { coverage: 0.85, luminosity: 0.5 },
      'trending': { coverage: 0.75, luminosity: 0.85 }
    };

    const category = Object.keys(baseColors).find(cat => 
      skinTone.includes(cat)
    ) || 'Medium';
    
    const undertoneType = Object.keys(undertoneAdjustments).find(type => 
      undertone.includes(type)
    ) || 'Neutral';

    const baseColor = baseColors[category as keyof typeof baseColors];
    const adjustment = undertoneAdjustments[undertoneType as keyof typeof undertoneAdjustments];
    const occasionMod = occasionAdjustments[occasion as keyof typeof occasionAdjustments] || occasionAdjustments['office'];

    const swatches = [];
    for (let i = 0; i < 9; i++) {
      const factor = (i - 4) * 0.12; // -0.48 to +0.48
      const coverage = occasionMod.coverage;
      const luminosity = occasionMod.luminosity;
      
      let r = baseColor.r + adjustment.r + (factor * 35);
      let g = baseColor.g + adjustment.g + (factor * 30);
      let b = baseColor.b + adjustment.b + (factor * 25);
      
      // Apply luminosity adjustment
      r = Math.max(0, Math.min(255, r + (luminosity - 0.7) * 20));
      g = Math.max(0, Math.min(255, g + (luminosity - 0.7) * 15));
      b = Math.max(0, Math.min(255, b + (luminosity - 0.7) * 10));
      
  const luxuryName = this.getLuxuryFoundationName(category, i, occasion);
      
      swatches.push({
        id: i,
        name: luxuryName,
        shortName: i === 4 ? 'Perfect Match' : i < 4 ? `${5-i} Lighter` : `${i-3} Deeper`,
        color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
        hex: `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`,
        isRecommended: i === 4,
        coverage: Math.round(coverage * 100),
        finish: (occasions[occasion as keyof typeof occasions]?.finish) || occasions['office'].finish
      });
    }
    
    return swatches;
  }

  private getLuxuryFoundationName(category: string, index: number, occasion: string): string {
    const categoryNames = {
      'Fair': ['Porcelain Silk', 'Ivory Dream', 'Pearl Radiance', 'Champagne Glow', 'Rose Gold'],
      'Light': ['Vanilla Mist', 'Honey Silk', 'Nude Perfection', 'Beige Luxury', 'Golden Hour'],
      'Medium': ['Caramel Velvet', 'Bronze Goddess', 'Amber Glow', 'Toffee Delight', 'Warm Embrace'],
      'Deep': ['Mahogany Royal', 'Espresso Rich', 'Cocoa Divine', 'Ebony Elegance', 'Bronze Majesty']
    };
    
    const occasionPrefix = {
      'wedding': 'Bridal',
      'party': 'Glamour',
      'office': 'Professional',
      'trending': 'Viral',
      'outdoor': 'Active',
      'casual': 'Everyday'
    };
    
    const baseName = categoryNames[category as keyof typeof categoryNames]?.[index % 5] || 'Custom Blend';
    const prefix = occasionPrefix[occasion as keyof typeof occasionPrefix] || 'Signature';
    
    return `${prefix} ${baseName}`;
  }
}