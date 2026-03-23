import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';

interface HeaderProps {
  cartItems: number;
  onHomeClick?: () => void;
  onCartClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItems, onHomeClick, onCartClick }) => {
  const { status: backend, isChecking, checkStatus } = useBackendStatus();
  const handleCartButtonClick = () => {
    onCartClick?.();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ss-open-cart'));
    }
  };

  return (
    <header className="lux-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onHomeClick}
            className="text-lg sm:text-2xl font-semibold lux-logo"
          >
            SKIN SIGNATURE
          </button>
          <nav className="hidden md:flex space-x-8">
            <button
              type="button"
              onClick={onHomeClick}
              className="lux-link"
            >
              Home
            </button>
            <span className="lux-link cursor-default">Technology</span>
            <span className="lux-link cursor-default">Products</span>
            <span className="lux-link cursor-default">Support</span>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#bfa77a] hover:text-[#f7f2ea] cursor-pointer lux-link-transition" />
            <button
              type="button"
              onClick={handleCartButtonClick}
              className="relative p-1 rounded-full hover:bg-[#e8dcc8] lux-cta-transition"
              aria-label="Open cart"
              title="Open cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#bfa77a]" strokeWidth={1.5} />
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#bfa77a] text-[#1c1a17] text-[0.6rem] font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  {cartItems > 9 ? '9+' : cartItems}
                </span>
              )}
            </button>
            <div className="ml-2 flex items-center">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isChecking}
                title="Quick ping check (lightweight). Opens full diagnostics separately."
                aria-label="Quick backend ping status check"
                className={`inline-flex items-center px-2 py-1 rounded-full text-[0.6rem] sm:text-[0.65rem] font-semibold border lux-cta-transition max-w-[140px] sm:max-w-none truncate ${backend === 'online' ? 'border-green-500 text-green-400' : backend === 'offline' ? 'border-red-500 text-red-400' : 'border-yellow-500 text-yellow-400'}`}
              >
                {isChecking
                  ? 'Backend: Checking...'
                  : backend === 'online'
                    ? 'Backend: Connected'
                    : backend === 'offline'
                      ? 'Backend: Offline'
                      : 'Backend: Check'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;