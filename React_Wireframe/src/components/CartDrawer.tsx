import React from 'react';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import type { CartItem } from '../hooks/useCart';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (uid: string) => void;
  onClear: () => void;
}

const cartridgeColorById: Record<string, string> = {
  F1: '#F2D6C9',
  F2: '#E6BFAE',
  F3: '#D7B08F',
  F4: '#C89B78',
  F5: '#B88763',
  F6: '#9C6B52',
  F7: '#7C5C3E',
  F8: '#5B3A29',
  A1: '#D6B28E',
  A2: '#B88B67',
  A3: '#8E5D43',
  B1: '#D9BF9F',
  B2: '#A97B59',
  B3: '#6C4633',
  L1: '#D2A679',
  L2: '#B76E79',
  L3: '#FF7F50',
  L4: '#C72C48',
  L5: '#7B294E',
  L6: '#E43F6F',
  L7: '#8B3A3A',
  L8: '#4B244A',
  LA: '#D2A679',
  LB: '#C48793',
  LC: '#7B294E',
  LD: '#FF7F50',
  LE: '#C72C48',
  LF: '#8B3A3A',
};

const cartridgeNameById: Record<string, string> = {
  F1: 'Porcelain Base',
  F2: 'Ivory Base',
  F3: 'Warm Beige',
  F4: 'Honey Beige',
  F5: 'Caramel',
  F6: 'Tan Blend',
  F7: 'Mocha Blend',
  F8: 'Deep Neutral',
  A1: 'Warm Sand',
  A2: 'Golden Beige',
  A3: 'Rich Amber',
  B1: 'Neutral Linen',
  B2: 'Soft Tan',
  B3: 'Deep Mocha',
  L1: 'Rose Nude',
  L2: 'Dusty Pink',
  L3: 'Coral Pop',
  L4: 'Classic Red',
  L5: 'Berry Plum',
  L6: 'Fuchsia Boost',
  L7: 'Brick Tone',
  L8: 'Deep Wine',
  LA: 'Nude Base',
  LB: 'Rose Core',
  LC: 'Deep Plum',
  LD: 'Coral Base',
  LE: 'True Red',
  LF: 'Brick Depth',
};

function swatchColorForItem(item: CartItem): string | undefined {
  if (item.cartridge_id && cartridgeColorById[item.cartridge_id]) {
    return cartridgeColorById[item.cartridge_id];
  }
  return item.shade_hex;
}

function swatchTitleForItem(item: CartItem): string {
  const parts: string[] = [];
  if (item.shade_name) {
    parts.push(`Shade: ${item.shade_name}`);
  }
  if (item.cartridge_id) {
    const cartridgeName = cartridgeNameById[item.cartridge_id];
    parts.push(cartridgeName ? `Cartridge: ${item.cartridge_id} · ${cartridgeName}` : `Cartridge: ${item.cartridge_id}`);
  }
  return parts.join(' • ');
}

function categoryLabel(item: CartItem): string {
  if (item.category === 'device') return 'Device';
  if (item.product_type === 'lipstick') return 'Lip Cartridge';
  return 'Foundation Cartridge';
}

function categoryBadgeClass(item: CartItem): string {
  if (item.category === 'device') return 'bg-[#1c1a17] text-[#bfa77a]';
  if (item.product_type === 'lipstick') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-50 text-amber-800';
}

function displayTitleForItem(item: CartItem): string {
  if (item.category === 'device') return item.product_name;
  if (item.cartridge_id && cartridgeNameById[item.cartridge_id]) {
    return `${cartridgeNameById[item.cartridge_id]} Cartridge`;
  }
  return item.product_name;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, items, onClose, onRemove, onClear }) => {

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm sm:max-w-md shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--lux-surface, #faf8f4)' }}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8dcc8]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#bfa77a]" strokeWidth={1.5} />
            <span className="font-semibold lux-title text-base sm:text-lg tracking-wide">
              Your Selection
            </span>
            {items.length > 0 && (
              <span className="ml-1 text-xs text-[#bfa77a] font-medium">
                ({items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#e8dcc8] lux-cta-transition"
            aria-label="Close cart"
          >
            <X className="w-5 h-5 text-[#6d4c1e]" />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingBag className="w-12 h-12 text-[#bfa77a]/40" strokeWidth={1} />
              <p className="lux-muted text-sm">Your selection is empty.</p>
              <p className="lux-muted text-xs">Try on a foundation or lipstick shade and add it to your cart.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.uid}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-[#e8dcc8] group"
              >
                {/* Shade swatch or icon */}
                {swatchColorForItem(item) ? (
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 border border-[#d4af37]/30 shadow-sm"
                    style={{ backgroundColor: swatchColorForItem(item) }}
                    title={swatchTitleForItem(item)}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-[#1c1a17] border border-[#bfa77a]/40 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#bfa77a]" strokeWidth={1.5} />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold lux-title text-sm truncate">{displayTitleForItem(item)}</span>
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold ${categoryBadgeClass(item)}`}>
                      {categoryLabel(item)}
                    </span>
                  </div>
                  {item.shade_name && (
                    <p className="text-xs lux-muted mt-0.5">Shade: {item.shade_name}</p>
                  )}
                  {item.cartridge_id && (
                    <p className="text-xs lux-muted">
                      Cartridge: {item.cartridge_id}
                      {cartridgeNameById[item.cartridge_id] ? ` · ${cartridgeNameById[item.cartridge_id]}` : ''}
                    </p>
                  )}
                  {item.finish && (
                    <p className="text-xs lux-muted capitalize">Finish: {item.finish}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs lux-muted">Qty {item.quantity}</span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => onRemove(item.uid)}
                  className="p-1.5 rounded-full text-[#bfa77a]/50 hover:text-rose-500 hover:bg-rose-50 lux-cta-transition flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Remove ${item.product_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[#e8dcc8] space-y-3">
            <button
              type="button"
              className="w-full py-3 px-4 rounded-xl bg-[#1c1a17] text-[#f7f2ea] text-sm font-semibold tracking-wide hover:bg-[#bfa77a] hover:text-[#1c1a17] lux-cta-transition"
            >
              Proceed to Checkout
            </button>
            <button
              type="button"
              onClick={onClear}
              className="w-full py-2 text-xs lux-muted hover:text-rose-500 lux-cta-transition text-center"
            >
              Clear all items
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
