import React from 'react';
import { Scan, Layers, Sparkles, Sliders } from 'lucide-react';

const FeatureCards: React.FC = () => {
  const features = [
    {
      icon: Scan,
      title: "AI-Powered Skin Analysis",
      description: "Instantly detect your unique skin tone and undertone for a truly personalized foundation match."
    },
    {
      icon: Layers,
      title: "Virtual Foundation Try-On",
      description: "See how each foundation shade looks on your face in real time — no testers needed."
    },
    {
      icon: Sparkles,
      title: "Lipstick Try-On",
      description: "Explore our curated lip colour palette with live AR overlay tailored to your complexion."
    },
    {
      icon: Sliders,
      title: "Custom Formulation",
      description: "Your skin data drives a bespoke formula blended with targeted skincare actives."
    }
  ];

  return (
    <div className="mt-12 sm:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {features.map((feature, index) => (
        <div
          key={index}
          className="group lux-card rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-300"
        >
          <div className="mb-4 sm:mb-5 text-[#bfa77a] group-hover:scale-110 transition-transform">
            <feature.icon className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={1.5} />
          </div>
          <h4 className="font-bold lux-title mb-2 sm:mb-3 text-sm sm:text-base tracking-wide">{feature.title}</h4>
          <p className="lux-muted text-xs sm:text-sm leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
};

export default FeatureCards;