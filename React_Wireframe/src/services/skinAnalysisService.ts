// API Configuration
import { apiFetch } from '../config/api';

export class SkinAnalysisService {
  
  async performRealTimeAnalysis(imageData: string, userLocation: any, selectedOccasion: string) {
    try {
      const response = await apiFetch('/v1/real-time-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          device_id: 'SS2025',
          analysis_type: 'real_time',
          location: userLocation,
          occasion: selectedOccasion
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Ensure all luxury skin tone fields and mixingPercents are mapped for frontend
        if (result.skin_tone_data) {
          result.skin_tone_data = {
            hex_color: result.skin_tone_data.hex_color,
            rgb: result.skin_tone_data.rgb,
            name: result.skin_tone_data.name || result.current_tone || '',
            undertone: result.skin_tone_data.undertone || result.undertone || '',
            description: result.skin_tone_data.description || result.luxury_description || '',
            shade: result.skin_tone_data.shade || result.shade || '',
            luxury_category: result.skin_tone_data.luxury_category || result.luxury_category || '',
            luxury_finish: result.skin_tone_data.luxury_finish || result.luxury_finish || '',
            luxury_tip: result.skin_tone_data.luxury_tip || result.luxury_tip || '',
            mixingPercents: result.skin_tone_data.mixingPercents || result.mixingPercents || { antiAging: 30, foundation: 50, customBlend: 20 }
          };
        }
        // Also map mixingPercents to top-level for easier access
        result.mixingPercents = result.mixingPercents || (result.skin_tone_data ? result.skin_tone_data.mixingPercents : { antiAging: 30, foundation: 50, customBlend: 20 });
        return result;
      } else {
        // Demo real-time data fallback
        return {
          skin_tone_confidence: Math.floor(Math.random() * 15) + 85,
          current_tone: 'Medium Warm',
          undertone: 'Golden Honey',
          lighting_condition: 'Natural Indoor Light',
          skin_health_score: Math.floor(Math.random() * 10) + 90,
          hydration_level: Math.floor(Math.random() * 20) + 75,
          skin_tone_data: {
            hex_color: '#D4A574',
            rgb: 'rgb(212, 165, 116)',
            name: 'Medium Warm',
            undertone: 'Golden Honey',
            description: 'Radiant Medium with Honey-Golden Luminosity',
            shade: 'Medium',
            luxury_category: 'Warm Caramel Silk',
            luxury_finish: 'Radiant Satin',
            luxury_tip: 'Use a hydrating primer and golden setting spray for a luxury, glowing complexion.'
          }
        };
      }
    } catch (error) {
      console.log('Real-time analysis failed:', error);
      // Return demo data
      return {
        skin_tone_confidence: Math.floor(Math.random() * 15) + 85,
        current_tone: 'Medium Warm with Golden Undertones',
        lighting_condition: 'Natural Indoor Light',
        skin_health_score: Math.floor(Math.random() * 10) + 90,
        hydration_level: Math.floor(Math.random() * 20) + 75
      };
    }
  }

  async performFullAnalysis(imageData: string, userLocation: any, selectedOccasion: string, lightingCondition: string) {
    try {
      const response = await apiFetch('/v1/comprehensive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          device_id: 'SS2025',
          analysis_type: 'comprehensive',
          location: userLocation,
          occasion: selectedOccasion,
          lighting_conditions: lightingCondition
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Ensure mixingPercents is mapped for frontend
        if (result.skin_tone_data) {
          result.skin_tone_data.mixingPercents = result.skin_tone_data.mixingPercents || result.mixingPercents || { antiAging: 30, foundation: 50, customBlend: 20 };
        }
        result.mixingPercents = result.mixingPercents || (result.skin_tone_data ? result.skin_tone_data.mixingPercents : { antiAging: 30, foundation: 50, customBlend: 20 });
        return result;
      } else {
        throw new Error('Analysis API failed');
      }
    } catch (error) {
      console.error('Full analysis failed:', error);
      // Enhanced demo result fallback
      const { occasions } = await import('../data/skinData');
      const safeKey = occasions[selectedOccasion] ? selectedOccasion : 'office';
      
      return {
        skin_tone: 'Medium Warm',
        undertone: 'Golden Honey',
        foundation_match: occasions[safeKey].name + ' Foundation',
        anti_aging_compounds: ['Hyaluronic Acid Complex', 'Peptide Fusion', 'Vitamin C & E', 'Retinol Microspheres'],
        confidence: 97,
        skin_tone_data: {
          hex_color: '#D4A574',
          rgb: 'rgb(212, 165, 116)',
          classification: 'Medium Warm with Golden Undertones',
          luxury_description: 'Radiant Medium with Honey-Golden Luminosity',
          luxury_category: 'Warm Caramel Silk'
        },
        occasion_recommendations: occasions[safeKey],
        climate_adjustments: userLocation ? ['Humidity-resistant formula', 'SPF 25 protection'] : [],
        recommendations: [
          `Perfect for ${occasions[safeKey].name.toLowerCase()} occasions`,
          'SPF 30+ daily protection essential',
          'Hydrating primer recommended for optimal application',
          'Setting spray advised for extended wear'
        ]
      };
    }
  }

  async performLuxuryFullAnalysis(imageData: string) {
    try {
      const response = await apiFetch('/v1/skin-full-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          foundation_color: '#ffffff' // placeholder, not used
        })
      });
      if (response.ok) {
        return await response.json();
      }
      return { success: false };
    } catch (e) {
      return { success: false, message: (e as Error).message };
    }
  }
}