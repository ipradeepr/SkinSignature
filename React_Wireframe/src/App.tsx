import { useState, useEffect } from 'react';
import SkinSignaturePage from './components/SkinSignaturePage';
import { apiUrl } from './config/api';

function App() {
  const [view, setView] = useState<'home' | 'product'>('home');
  const [experienceType, setExperienceType] = useState<'store' | 'in-house'>('store');
  const [launchMode, setLaunchMode] = useState<'store' | 'cartridge' | 'in-house'>('store');
  const healthViewUrl = apiUrl('/v1/health/view');
  const healthJsonUrl = apiUrl('/v1/health');

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '/home') {
      setView('home');
      if (path !== '/home') {
        window.history.replaceState({ view: 'home' }, '', '/home');
      }
      return;
    }

    setView('product');
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setView(window.location.pathname === '/home' ? 'home' : 'product');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Push state to history when view changes
  useEffect(() => {
    if (view === 'product') {
      if (window.location.pathname !== '/try-on') {
        window.history.pushState({ view: 'product' }, '', '/try-on');
      }
    } else if (view === 'home') {
      if (window.location.pathname !== '/home') {
        window.history.replaceState({ view: 'home' }, '', '/home');
      }
    }
  }, [view]);

  const renderHome = () => (
    <div className="min-h-screen lux-page flex items-center justify-center">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Brand Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-block px-6 py-3 rounded-full lux-pill bg-white/70">
            <span className="text-2xl font-semibold lux-title tracking-[0.12em]">
              SKIN SIGNATURE
            </span>
          </div>
          <div className="mt-4 lux-muted">
            Elevated Beauty Intelligence
          </div>
        </div>

        {/* Three Luxury Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Store Experience */}
          <button
            type="button"
            onClick={() => {
              setExperienceType('store');
              setLaunchMode('store');
              setView('product');
            }}
            className="group relative overflow-hidden rounded-2xl lux-card lux-smooth-panel"
          >
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background: 'radial-gradient(1200px 600px at 80% -20%, rgba(212,175,55,0.28) 0%, transparent 60%)'
              }}
            />
            <div className="p-6 sm:p-7 flex flex-col items-center text-center min-h-[330px] sm:min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-white/80 border border-[rgba(191,167,122,0.55)] flex items-center justify-center shadow-lg mb-4">
                <span className="text-2xl">🏬</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 lux-title">
                In-Store Experience
              </h2>
              <p className="text-sm leading-relaxed lux-muted max-w-md">
                Indulge in a boutique, concierge-led try-on with professional lighting and precision shade matching.
              </p>
              <div className="mt-5 sm:mt-6">
                <span className="main-action-btn">
                  Enter Experience
                </span>
              </div>
            </div>
          </button>

          {/* In-house Experience */}
          <button
            type="button"
            onClick={() => {
              setExperienceType('in-house');
              setLaunchMode('in-house');
              setView('product');
            }}
            className="group relative overflow-hidden rounded-2xl lux-card lux-smooth-panel"
          >
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background: 'radial-gradient(1200px 600px at 20% -20%, rgba(191,161,106,0.28) 0%, transparent 60%)'
              }}
            />
            <div className="p-6 sm:p-7 flex flex-col items-center text-center min-h-[330px] sm:min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-white/80 border border-[rgba(191,167,122,0.55)] flex items-center justify-center shadow-lg mb-4">
                <span className="text-2xl">🏡</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 lux-title">
                In-house Experience
              </h2>
              <p className="text-sm leading-relaxed lux-muted max-w-md">
                Your AI beauty device reads skin tone, undertone, lighting, and occasion to blend foundation and lipstick from your color cartridges for a perfect-match shade every time.
              </p>
              <div className="mt-5 sm:mt-6">
                <span className="main-action-btn">
                  Enter Experience
                </span>
              </div>
            </div>
          </button>

          {/* Luxury Standards */}
          <button
            type="button"
            onClick={() => {
              setExperienceType('store');
              setLaunchMode('cartridge');
              setView('product');
            }}
            className="group relative overflow-hidden rounded-2xl lux-card lux-smooth-panel"
          >
            <div
              className="absolute inset-0 opacity-15"
              style={{
                background: 'radial-gradient(1200px 600px at 50% -20%, rgba(212,175,55,0.26) 0%, transparent 60%)'
              }}
            />
            <div className="p-6 sm:p-7 flex flex-col items-center text-center min-h-[330px] sm:min-h-[360px]">
              <div className="w-16 h-16 rounded-2xl bg-white/80 border border-[rgba(191,167,122,0.55)] flex items-center justify-center shadow-lg mb-4">
                <span className="text-2xl">🧴</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 lux-title">
                Luxury Standards
              </h2>
              <p className="text-sm leading-relaxed lux-muted max-w-md">
                Already have the device? Explore different cartridges, buy the ones you need, and blend unique shades tailored to your style and skin profile.
              </p>
              <div className="mt-5 sm:mt-6">
                <span className="main-action-btn">
                  Enter Experience
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer Accent */}
        <div className="mt-12 text-center">
          <span className="text-xs tracking-widest lux-muted">
            Curated by Beauty Technology Advisors • Signature Series
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App min-h-screen overflow-x-hidden">
      {view === 'home' ? renderHome() : <SkinSignaturePage experienceType={experienceType} launchMode={launchMode} onNavigateHome={() => setView('home')} />}
      <div className="fixed bottom-3 right-3 z-40">
        <div className="rounded-xl border border-[#bfa77a]/50 bg-white/90 backdrop-blur px-3 py-2 shadow-lg flex items-center gap-3">
          <a
            href={healthViewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#6d4c1e] hover:text-[#bfa77a] transition"
          >
            Health Dashboard
          </a>
          <span className="text-[#bfa77a]/70">|</span>
          <a
            href={healthJsonUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[#6d4c1e] hover:text-[#bfa77a] transition"
          >
            Raw JSON
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;