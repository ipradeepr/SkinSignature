// ...existing code...
import { Heart } from 'lucide-react';
import { useBackendStatus } from '../hooks/useBackendStatus';

interface HeaderProps {
  cartItems: number;
  onHomeClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartItems, onHomeClick }) => {
  const { status: backend, isChecking, checkStatus } = useBackendStatus();

  return (
    <header className="lux-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex justify-between items-center">
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
              className="lux-link transition-colors"
            >
              Home
            </button>
            <span className="lux-link cursor-default">Technology</span>
            <span className="lux-link cursor-default">Products</span>
            <span className="lux-link cursor-default">Support</span>
          </nav>
          <div className="flex items-center space-x-4">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-[#bfa77a] hover:text-[#f7f2ea] cursor-pointer transition-colors" />
            <div className="relative">
              <div className="w-5 h-5 sm:w-6 sm:h-6 text-[#bfa77a] cursor-pointer">🛒</div>
              {cartItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#bfa77a] text-[#1c1a17] text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  {cartItems}
                </span>
              )}
            </div>
            <div className="ml-2 flex items-center">
              <button
                type="button"
                onClick={checkStatus}
                disabled={isChecking}
                className={`inline-flex items-center px-2 py-1 rounded-full text-[0.65rem] font-semibold border transition ${backend === 'online' ? 'border-green-500 text-green-400' : backend === 'offline' ? 'border-red-500 text-red-400' : 'border-yellow-500 text-yellow-400'}`}
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