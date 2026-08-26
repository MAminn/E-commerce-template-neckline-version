import React from "react";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react";
import type { CartPageModernTemplateProps } from "./CartPageModernTemplate";
import { OfferProgressBanner } from "./OfferProgressBanner";
import {
  AppliedOffersSavings,
  computeOfferSavingsTotal,
} from "./AppliedOffersSavings";

/**
 * CartPageMinimalTemplate
 * Mobile-first minimal cart layout matching the minimal store aesthetic.
 * Clean, no-card design, stone palette, full-width on mobile.
 */
export function CartPageMinimalTemplate({
  items = [],
  totals,
  isLoading = false,
  isUpdating = false,
  currency = "EGP",
  onQuantityChange,
  onRemoveItem,
  onApplyCoupon,
  onProceedToCheckout,
}: CartPageModernTemplateProps) {
  const [couponCode, setCouponCode] = React.useState("");
  const [couponApplied, setCouponApplied] = React.useState(false);

  const handleApplyCoupon = () => {
    if (couponCode.trim() && onApplyCoupon) {
      onApplyCoupon(couponCode.trim());
      setCouponApplied(true);
      setCouponCode("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <ShoppingCart className="w-12 h-12 text-gray-200 mb-4" />
        <h2 className="text-[18px] font-medium text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-[14px] text-gray-400 mb-6">Add items to your cart to continue shopping</p>
        <a
          href="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-700 transition-colors">
          Continue Shopping
        </a>
      </div>
    );
  }

  const cartSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const appliedOffers = totals.appliedOffers ?? [];
  const totalSavings = computeOfferSavingsTotal(
    appliedOffers,
    totals.discount ?? 0,
  );

  return (
    <>
      <div className="min-h-screen bg-white pb-24 sm:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Page title */}
          <h1 className="text-[22px] sm:text-[28px] font-medium text-gray-900 mb-4 sm:mb-6">
            Cart <span className="text-gray-400 font-normal text-[16px] sm:text-[18px]">({items.length} {items.length === 1 ? "item" : "items"})</span>
          </h1>

          {/* Offer progress banner */}
          <OfferProgressBanner
            cartSubtotal={cartSubtotal}
            cartQuantity={items.reduce((s, i) => s + i.quantity, 0)}
            appliedOffers={appliedOffers}
            currency={currency}
          />

          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-12">

            {/* ── Left: Items ───────────────────────────────── */}
            <div>
              {/* Column headers (desktop only) */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_100px_40px] gap-4 pb-3 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                <span>Product</span>
                <span className="text-center">Quantity</span>
                <span className="text-right">Price</span>
                <span />
              </div>

              {/* Items list */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  const hasDiscount = item.originalPrice != null && item.originalPrice > item.price;
                  return (
                    <div key={item.id} className={`py-5 sm:py-6 transition-opacity ${isUpdating ? "opacity-60 pointer-events-none" : ""}`}>

                      {/* Mobile layout */}
                      <div className="flex gap-3 sm:hidden">
                        {/* Image */}
                        <div className="w-[88px] h-[88px] shrink-0 bg-gray-50 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingCart className="w-6 h-6 text-gray-200" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          {/* Name row + delete */}
                          <div className="flex items-start gap-1">
                            <p
                              className="flex-1 text-[14px] font-medium leading-snug break-words overflow-hidden"
                              style={{ color: "#111827", fontFamily: "'Poppins', sans-serif" }}>
                              {item.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => onRemoveItem?.(item.id)}
                              aria-label="Remove item"
                              className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors -mr-1">
                              <Trash2 className="w-[15px] h-[15px]" />
                            </button>
                          </div>

                          {item.variant && (
                            <p className="text-[11px] text-gray-400 leading-none">{item.variant}</p>
                          )}

                          {/* Unit price */}
                          <div className="flex items-center gap-1.5">
                            {hasDiscount && (
                              <span className="text-[11px] text-gray-400 line-through">
                                {item.originalPrice!.toFixed(2)} {currency}
                              </span>
                            )}
                            <span className={`text-[12px] ${hasDiscount ? "text-red-600 font-medium" : "text-gray-400"}`}>
                              {item.price.toFixed(2)} {currency} each
                            </span>
                            {hasDiscount && (
                              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 font-medium">
                                -{Math.round((1 - item.price / item.originalPrice!) * 100)}%
                              </span>
                            )}
                          </div>

                          {/* Qty + line total */}
                          <div className="flex flex-col items-center mt-auto pt-1">
                            <div className="flex  items-center border border-gray-200 w-fit">
                              <button
                                type="button"
                                onClick={() => onQuantityChange?.(item.id, Math.max(1, item.quantity - 1))}
                                aria-label="Decrease quantity"
                                className="w-[38px] h-[38px] flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                disabled={item.quantity <= 1}>
                                <Minus className="w-3 h-3" />
                              </button>
                              <span
                                className="w-8 text-center text-[13px] font-medium"
                                style={{ color: "#111827", fontFamily: "'Poppins', sans-serif" }}>
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onQuantityChange?.(item.id, item.quantity + 1)}
                                aria-label="Increase quantity"
                                className="w-[38px] h-[38px] flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                                disabled={item.stock != null && item.quantity >= item.stock}>
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              {hasDiscount && (
                                <span className="text-[12px] text-gray-400 line-through">
                                  {(item.originalPrice! * item.quantity).toFixed(2)} {currency}
                                </span>
                              )}
                              <p
                                className={`text-[15px] font-semibold ${hasDiscount ? "text-red-600" : ""}`}
                                style={{ color: hasDiscount ? undefined : "#111827", fontFamily: "'Poppins', sans-serif" }}>
                                {lineTotal.toFixed(2)} {currency}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:grid grid-cols-[1fr_120px_100px_40px] gap-4 items-center">
                        <div className="flex items-center gap-4">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover bg-gray-50 shrink-0" />
                          ) : (
                            <div className="w-16 h-16 bg-gray-50 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p
                              className="text-[14px] font-medium break-words"
                              style={{ color: "#111827", fontFamily: "'Poppins', sans-serif" }}>
                              {item.name}
                            </p>
                            {item.variant && <p className="text-[12px] text-gray-400 mt-0.5">{item.variant}</p>}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {hasDiscount && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  {item.originalPrice!.toFixed(2)} {currency}
                                </span>
                              )}
                              <span className={`text-[12px] ${hasDiscount ? "text-red-600 font-medium" : "text-gray-500"}`}>
                                {item.price.toFixed(2)} {currency}
                              </span>
                              {hasDiscount && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 font-medium">
                                  -{Math.round((1 - item.price / item.originalPrice!) * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center border border-gray-200 w-fit mx-auto">
                          <button
                            type="button"
                            onClick={() => onQuantityChange?.(item.id, Math.max(1, item.quantity - 1))}
                            aria-label="Decrease quantity"
                            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                            disabled={item.quantity <= 1}>
                            <Minus className="w-3 h-3" />
                          </button>
                          <span
                            className="w-8 text-center text-[13px] font-medium"
                            style={{ color: "#111827", fontFamily: "'Poppins', sans-serif" }}>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onQuantityChange?.(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                            disabled={item.stock != null && item.quantity >= item.stock}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          {hasDiscount && (
                            <p className="text-[11px] text-gray-400 line-through">
                              {(item.originalPrice! * item.quantity).toFixed(2)} {currency}
                            </p>
                          )}
                          <p
                            className={`text-[14px] font-semibold ${hasDiscount ? "text-red-600" : ""}`}
                            style={{ color: hasDiscount ? undefined : "#111827", fontFamily: "'Poppins', sans-serif" }}>
                            {lineTotal.toFixed(2)} {currency}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem?.(item.id)}
                          aria-label="Remove item"
                          className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors justify-self-end">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Promo code */}
              <div className="mt-6 lg:mt-8 pt-6 border-t border-gray-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <p className="text-[13px] font-medium text-gray-900 shrink-0">
                    Apply promo code
                  </p>
                  <div className="flex flex-1 gap-2 min-w-0">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyCoupon();
                      }}
                      placeholder="Enter code"
                      className="flex-1 px-4 py-2.5 border border-gray-200 text-[13px] text-gray-900 placeholder-gray-300 outline-none focus:border-gray-400 transition-colors bg-white min-w-0"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim()}
                      className="px-5 py-2.5 bg-gray-900 text-white text-[12px] font-medium uppercase tracking-wide hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                      Apply
                    </button>
                  </div>
                </div>
                {couponApplied && totals.discount != null && totals.discount > 0 && (
                  <p className="text-[12px] text-green-600 mt-2">
                    Promo code applied — saving {totals.discount.toFixed(2)} {currency}
                  </p>
                )}
              </div>
            </div>

            {/* ── Right: Order Summary ────────────────────── */}
            <div className="mt-8 lg:mt-0">
              <div className="bg-gray-50 p-6">
                <h2 className="text-[15px] font-semibold text-gray-900 mb-5">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-[13px] text-gray-600">
                    <span>Subtotal</span>
                    <span>{totals.subtotal.toFixed(2)} {currency}</span>
                  </div>
                  {totals.discount != null && totals.discount > 0 && (
                    <div className="flex justify-between text-[13px] text-green-600">
                      <span>Discount</span>
                      <span>−{totals.discount.toFixed(2)} {currency}</span>
                    </div>
                  )}
                  <AppliedOffersSavings
                    appliedOffers={appliedOffers}
                    currency={currency}
                  />
                  <div className="flex justify-between text-[13px] text-gray-600">
                    <span>Shipping</span>
                    <span>{totals.shipping != null && totals.shipping > 0 ? `${totals.shipping.toFixed(2)} ${currency}` : "Calculated at checkout"}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between text-[15px] font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{totals.grandTotal.toFixed(2)} {currency}</span>
                  </div>
                </div>

                {/* Checkout button — visible on desktop always, hidden on mobile (mobile uses sticky bar) */}
                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  disabled={isUpdating || items.length === 0}
                  className="mt-6 w-full py-4 bg-gray-900 text-white text-[13px] font-medium uppercase tracking-wider hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block">
                  {isUpdating ? "Updating…" : "Proceed to Checkout"}
                </button>

                <a
                  href="/shop"
                  className="mt-3 w-full hidden sm:flex items-center justify-center py-3 text-[12px] text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wide">
                  ← Continue Shopping
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Mobile sticky checkout bar ─────────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <AppliedOffersSavings
          appliedOffers={appliedOffers}
          promoDiscount={totals.discount ?? 0}
          currency={currency}
          variant="sticky-banner"
        />
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-gray-500 uppercase tracking-wide">Total</span>
            <div className="text-right">
              {totalSavings > 0 && (
                <p className="text-[10px] font-medium text-emerald-600">
                  Saving {totalSavings.toFixed(2)} {currency}
                </p>
              )}
              <span className="text-[15px] font-semibold text-gray-900">
                {totals.grandTotal.toFixed(2)} {currency}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onProceedToCheckout}
            disabled={isUpdating || items.length === 0}
            className="flex w-full items-center justify-center gap-2 py-3.5 bg-gray-900 text-white text-[13px] font-medium uppercase tracking-wider hover:bg-gray-700 active:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isUpdating ? "Updating…" : "Proceed to Checkout"}
            <ArrowRight className="h-4 w-4" />
          </button>
        <a
          href="/shop"
          className="mt-2 w-full flex items-center justify-center py-2 text-[11px] text-gray-400 hover:text-gray-700 transition-colors uppercase tracking-wide">
          ← Continue Shopping
        </a>
        </div>
      </div>
    </>
  );
}
