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

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, items, onClose, onRemove, onClear }) => {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
                {item.shade_hex ? (
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0 border border-[#d4af37]/30 shadow-sm"
                    style={{ backgroundColor: item.shade_hex }}
                    title={item.shade_name}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-[#1c1a17] border border-[#bfa77a]/40 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#bfa77a]" strokeWidth={1.5} />
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold lux-title text-sm truncate">{item.product_name}</span>
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold ${categoryBadgeClass(item)}`}>
                      {categoryLabel(item)}
                    </span>
                  </div>
                  {item.shade_name && (
                    <p className="text-xs lux-muted mt-0.5">Shade: {item.shade_name}</p>
                  )}
                  {item.cartridge_percentage !== undefined && (
                    <p className="text-xs lux-muted">Mix: {item.cartridge_percentage}%</p>
                  )}
                  {item.finish && (
                    <p className="text-xs lux-muted capitalize">Finish: {item.finish}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs lux-muted">Qty {item.quantity}</span>
                    <span className="text-xs font-semibold lux-title">
                      {item.price > 0 ? `£${item.price.toFixed(2)}` : 'Complimentary'}
                    </span>
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
            <div className="flex items-center justify-between">
              <span className="lux-muted text-sm">Estimated Total</span>
              <span className="font-bold lux-title text-base">
                {total > 0 ? `£${total.toFixed(2)}` : 'Complimentary'}
              </span>
            </div>
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
