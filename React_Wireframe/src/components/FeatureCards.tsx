// ...existing code...
import { Brain, Palette, Sparkles, Shield } from 'lucide-react';

const FeatureCards: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning analyzes 200+ skin parameters for precision matching"
    },
    {
      icon: Palette,
      title: "Custom Formulation",
      description: "Real-time foundation blending with personalized anti-aging compounds"
    },
    {
      icon: Sparkles,
      title: "Multi-Light Testing",
      description: "Perfect coverage analysis across different lighting environments"
    },
    {
      icon: Shield,
      title: "Skincare Integration",
      description: "Anti-aging benefits built into every custom foundation formula"
    }
  ];

  return (
    <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {features.map((feature, index) => (
        <div
          key={index}
          className="group lux-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-2xl transition-all duration-300"
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#1c1a17] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform border border-[#bfa77a]">
            <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-[#f7f2ea]" />
          </div>
          <h4 className="font-semibold lux-title mb-2 sm:mb-3 text-sm sm:text-base">{feature.title}</h4>
          <p className="lux-muted text-xs sm:text-sm leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};

export default FeatureCards;