// Luxury skin tone terminology and classifications
export const luxurySkinTones = {
  'Fair': {
    range: ['Porcelain', 'Ivory', 'Pearl', 'Alabaster', 'Cream'],
    undertones: {
      'Cool': ['Rose', 'Pink Bisque', 'Cool Ivory', 'Platinum'],
      'Neutral': ['Natural Ivory', 'Silk', 'Vanilla', 'Champagne'],
      'Warm': ['Golden Ivory', 'Honey Cream', 'Warm Vanilla', 'Butter']
    }
  },
  'Light': {
    range: ['Light', 'Fair Rose', 'Beige', 'Natural', 'Soft Tan'],
    undertones: {
      'Cool': ['Rose Beige', 'Cool Sand', 'Mauve', 'Dusty Rose'],
      'Neutral': ['Natural Beige', 'Nude', 'Soft Camel', 'Bisque'],
      'Warm': ['Golden Beige', 'Warm Sand', 'Honey', 'Apricot']
    }
  },
  'Medium': {
    range: ['Medium', 'Olive', 'Tan', 'Golden', 'Bronze'],
    undertones: {
      'Cool': ['Cool Olive', 'Taupe', 'Mocha', 'Cool Bronze'],
      'Neutral': ['Neutral Tan', 'Caramel', 'Toffee', 'Natural Bronze'],
      'Warm': ['Golden Tan', 'Warm Caramel', 'Amber', 'Honey Bronze']
    }
  },
  'Deep': {
    range: ['Deep', 'Rich', 'Mahogany', 'Espresso', 'Ebony'],
    undertones: {
      'Cool': ['Cool Mahogany', 'Deep Plum', 'Rich Cocoa', 'Cool Ebony'],
      'Neutral': ['Natural Mahogany', 'Chestnut', 'Deep Caramel', 'Espresso'],
      'Warm': ['Golden Mahogany', 'Warm Ebony', 'Rich Amber', 'Bronze Goddess']
    }
  }
};

// Occasion-based recommendations with geolocation considerations
export type OccasionRecommendation = {
  name: string;
  coverage: string;
  finish: string;
  description: string;
  climateFactor: string;
};

export const occasions: { [key: string]: OccasionRecommendation } = {
  'office': {
    name: 'Professional/Office',
    coverage: 'Medium',
    finish: 'Natural Matte',
    description: 'Long-wearing, professional finish',
    climateFactor: 'humidity-resistant'
  },
  'wedding': {
    name: 'Wedding/Formal',
    coverage: 'Full',
    finish: 'Luminous',
    description: 'Photography-ready, long-lasting',
    climateFactor: 'sweat-proof'
  },
  'party': {
    name: 'Party/Evening',
    coverage: 'Medium-Full',
    finish: 'Radiant',
    description: 'Glowing, evening-appropriate',
    climateFactor: 'transfer-resistant'
  },
  'casual': {
    name: 'Casual/Daily',
    coverage: 'Light-Medium',
    finish: 'Natural',
    description: 'Comfortable, breathable',
    climateFactor: 'lightweight'
  },
  'outdoor': {
    name: 'Outdoor/Active',
    coverage: 'Medium',
    finish: 'Matte',
    description: 'SPF-enhanced, sport-proof',
    climateFactor: 'waterproof'
  },
  'trending': {
    name: 'Latest Trending',
    coverage: 'Buildable',
    finish: 'Satin-Glow',
    description: 'Instagram-ready, viral finish',
    climateFactor: 'all-weather'
  }
};