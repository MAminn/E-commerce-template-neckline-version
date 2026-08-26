import React from "react";
import { OfferProgressBanner } from "./OfferProgressBanner";
import {
  AppliedOffersSavings,
  computeOfferSavingsTotal,
} from "./AppliedOffersSavings";
import { Button } from "#root/components/ui/button";
import { Input } from "#root/components/ui/input";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Lock,
  Truck,
  RotateCcw,
} from "lucide-react";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";

/**
 * Cart item interface
 */
export interface CartPageCartItem {
  id: string;
  name: string;
  price: number;
  /** Original price before discount — present only when the item was discounted */
  originalPrice?: number | null;
  quantity: number;
  imageUrl?: string | null;
  variant?: string | null;
  stock?: number | null;
  available: boolean;
}

/**
 * Cart totals interface
 */
export interface CartPageTotals {
  subtotal: number;
  discount?: number;
  shipping?: number;
  grandTotal: number;
  appliedOffers?: Array<{
    name: string;
    discountAmount: number;
    freeShipping: boolean;
  }>;
}

/**
 * Props for CartPageModernTemplate
 */
export interface CartPageModernTemplateProps {
  items: CartPageCartItem[];
  totals: CartPageTotals;
  isLoading?: boolean;
  isUpdating?: boolean;
  currency?: string;
  onQuantityChange?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onApplyCoupon?: (code: string) => void;
  onProceedToCheckout?: () => void;
}

/**
 * CartPageModernTemplate Component
 *
 * Modern cart page layout with item management and checkout flow
 */
export function CartPageModernTemplate({
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
  const { t } = useMinimalI18n();

  const handleApplyCoupon = () => {
    if (couponCode.trim() && onApplyCoupon) {
      onApplyCoupon(couponCode);
      setCouponCode("");
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-[60vh] flex items-center justify-center'>
        <ShoppingCart className='w-10 h-10 text-muted-foreground animate-pulse' />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className='min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center'>
        <ShoppingCart className='w-14 h-14 text-muted-foreground/40' />
        <h2 className='text-2xl font-bold'>{t("cart.empty")}</h2>
        <p className='text-muted-foreground'>{t("cart.empty_cta")}</p>
        <Button
          onClick={() => (window.location.href = "/shop")}
          className='mt-2'>
          {t("cart.continue_shopping")}
        </Button>
      </div>
    );
  }

  const totalSavings = computeOfferSavingsTotal(
    totals.appliedOffers,
    totals.discount ?? 0,
  );

  const cartSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const appliedOffers = totals.appliedOffers ?? [];

  return (
    <>
    <div className='min-h-screen bg-background pb-24 sm:pb-0'>
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12'>

        {/* ── Page heading ───────────────────────────────── */}
        <h1 className='text-2xl sm:text-3xl font-extrabold uppercase tracking-tight mb-6'>
          {t("cart.title") || "Shopping Cart"}
          <span className='ms-3 text-sm font-semibold tracking-widest text-muted-foreground uppercase'>
            ({items.length} {items.length === 1 ? "item" : "items"})
          </span>
        </h1>

        {/* Offer progress banner */}
        <OfferProgressBanner
          cartSubtotal={cartSubtotal}
          cartQuantity={cartQuantity}
          appliedOffers={appliedOffers}
          currency={currency}
        />

        <div className='lg:grid lg:grid-cols-[1fr_380px] lg:gap-12'>
          {/* ── Items list ─────────────────────────────────── */}
          <div>
            {/* Column headers — desktop */}
            <div className='hidden sm:grid grid-cols-[1fr_160px_110px_40px] gap-4 pb-4 border-b text-xs font-semibold uppercase tracking-widest text-muted-foreground'>
              <span>{t("cart.product") || "Product"}</span>
              <span className='text-center'>
                {t("cart.quantity") || "Quantity"}
              </span>
              <span className='text-right'>{t("cart.total") || "Total"}</span>
              <span />
            </div>

            {/* Items */}
            <div className='divide-y'>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`py-6 transition-opacity ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}>
                  {/* Mobile */}
                  <div className='flex gap-4 sm:hidden'>
                    <div className='w-20 h-20 shrink-0 bg-muted rounded-lg overflow-hidden border'>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <ShoppingCart className='w-5 h-5 text-muted-foreground/30' />
                        </div>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='font-semibold text-sm leading-snug'>
                            {item.name}
                          </p>
                          {item.variant && (
                            <p className='text-xs text-muted-foreground mt-0.5'>
                              {item.variant}
                            </p>
                          )}
                          <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                            {item.originalPrice != null && item.originalPrice > item.price && (
                              <span className='text-xs text-muted-foreground line-through'>
                                {currency}{item.originalPrice.toFixed(2)}
                              </span>
                            )}
                            <span className={`text-sm ${item.originalPrice != null && item.originalPrice > item.price ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                              {currency}{item.price.toFixed(2)}{" "}{t("checkout.each") || "each"}
                            </span>
                            {item.originalPrice != null && item.originalPrice > item.price && (
                              <span className='text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded'>
                                -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => onRemoveItem?.(item.id)}
                          disabled={isUpdating}
                          aria-label='Remove item'
                          className='shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors'>
                          <Trash2 className='w-4 h-4' />
                        </button>
                      </div>
                      <div className='flex items-center justify-between mt-3'>
                        <div className='inline-flex items-center border rounded-lg'>
                          <button
                            type='button'
                            onClick={() =>
                              onQuantityChange?.(
                                item.id,
                                Math.max(1, item.quantity - 1),
                              )
                            }
                            disabled={isUpdating || item.quantity <= 1}
                            aria-label='Decrease quantity'
                            className='w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors rounded-l-lg disabled:opacity-40'>
                            <Minus className='w-3.5 h-3.5' />
                          </button>
                          <span className='w-10 text-center text-sm font-semibold'>
                            {item.quantity}
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              onQuantityChange?.(item.id, item.quantity + 1)
                            }
                            disabled={
                              isUpdating ||
                              (item.stock != null &&
                                item.quantity >= item.stock)
                            }
                            aria-label='Increase quantity'
                            className='w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors rounded-r-lg disabled:opacity-40'>
                            <Plus className='w-3.5 h-3.5' />
                          </button>
                        </div>
                        <div className='text-right'>
                          {item.originalPrice != null && item.originalPrice > item.price && (
                            <p className='text-xs text-muted-foreground line-through'>
                              {currency}{(item.originalPrice * item.quantity).toFixed(2)}
                            </p>
                          )}
                          <p className={`font-bold ${item.originalPrice != null && item.originalPrice > item.price ? "text-red-500" : ""}`}>
                            {currency}{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className='hidden sm:grid grid-cols-[1fr_160px_110px_40px] gap-4 items-center'>
                    {/* Product info */}
                    <div className='flex items-center gap-4'>
                      <div className='w-20 h-20 shrink-0 bg-muted rounded-xl overflow-hidden border'>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center'>
                            <ShoppingCart className='w-5 h-5 text-muted-foreground/30' />
                          </div>
                        )}
                      </div>
                      <div className='min-w-0'>
                        <p className='font-semibold'>{item.name}</p>
                        {item.variant && (
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            {item.variant}
                          </p>
                        )}
                        <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                          {item.originalPrice != null && item.originalPrice > item.price && (
                            <span className='text-xs text-muted-foreground line-through'>
                              {currency}{item.originalPrice.toFixed(2)}
                            </span>
                          )}
                          <span className={`text-sm ${item.originalPrice != null && item.originalPrice > item.price ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                            {currency}{item.price.toFixed(2)} {t("checkout.each") || "each"}
                          </span>
                          {item.originalPrice != null && item.originalPrice > item.price && (
                            <span className='text-[10px] bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded'>
                              -{Math.round((1 - item.price / item.originalPrice) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quantity stepper */}
                    <div className='flex justify-center'>
                      <div className='inline-flex items-center border rounded-lg'>
                        <button
                          type='button'
                          onClick={() =>
                            onQuantityChange?.(
                              item.id,
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          disabled={isUpdating || item.quantity <= 1}
                          aria-label='Decrease quantity'
                          className='w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors rounded-l-lg disabled:opacity-40'>
                          <Minus className='w-3.5 h-3.5' />
                        </button>
                        <span className='w-10 text-center text-sm font-semibold'>
                          {item.quantity}
                        </span>
                        <button
                          type='button'
                          onClick={() =>
                            onQuantityChange?.(item.id, item.quantity + 1)
                          }
                          disabled={
                            isUpdating ||
                            (item.stock != null && item.quantity >= item.stock)
                          }
                          aria-label='Increase quantity'
                          className='w-9 h-9 flex items-center justify-center hover:bg-muted transition-colors rounded-r-lg disabled:opacity-40'>
                          <Plus className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className='text-right'>
                      {item.originalPrice != null && item.originalPrice > item.price && (
                        <p className='text-xs text-muted-foreground line-through'>
                          {currency}{(item.originalPrice * item.quantity).toFixed(2)}
                        </p>
                      )}
                      <p className={`font-bold ${item.originalPrice != null && item.originalPrice > item.price ? "text-red-500" : ""}`}>
                        {currency}{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Remove */}
                    <button
                      type='button'
                      onClick={() => onRemoveItem?.(item.id)}
                      disabled={isUpdating}
                      aria-label='Remove item'
                      className='justify-self-end p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors'>
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Coupon code ──────────────────────────────── */}
            <div className='mt-6 pt-6 border-t'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
                <p className='text-sm font-semibold shrink-0'>
                  Apply promo code
                </p>
                <div className='flex gap-2 flex-1 w-full sm:w-auto items-center'>
                  <Input
                    placeholder={t("cart.enter_code") || "Enter coupon code"}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleApplyCoupon();
                    }}
                    disabled={isUpdating}
                    className='flex-1 text-sm'
                  />
                  <Button
                    variant='primary'
                    onClick={handleApplyCoupon}
                    disabled={isUpdating || !couponCode.trim()}
                    className='shrink-0 font-bold tracking-wide'>
                    {t("cart.apply") || "Apply"}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Trust badges ─────────────────────────────── */}
            {/* Desktop only — on mobile these are shown after the order summary */}
            <div className='hidden lg:grid mt-8 pt-6 border-t grid-cols-4 gap-4 text-center text-xs text-muted-foreground'>
              <div className='flex flex-col items-center gap-1.5'>
                <ShieldCheck className='w-5 h-5 text-muted-foreground/70' />
                <span>100% Authentic Products</span>
              </div>
              <div className='flex flex-col items-center gap-1.5'>
                <Lock className='w-5 h-5 text-muted-foreground/70' />
                <span>Secure Payments</span>
              </div>
              <div className='flex flex-col items-center gap-1.5'>
                <Truck className='w-5 h-5 text-muted-foreground/70' />
                <span>Fast &amp; Reliable Delivery</span>
              </div>
              <div className='flex flex-col items-center gap-1.5'>
                <RotateCcw className='w-5 h-5 text-muted-foreground/70' />
                <span>Easy Returns</span>
              </div>
            </div>
          </div>

          {/* ── Order Summary ──────────────────────────────── */}
          <div className='mt-8 lg:mt-0 lg:sticky lg:top-6 lg:self-start'>
            <div className='border rounded-2xl bg-card p-6 space-y-5'>
              <h2 className='font-extrabold text-base uppercase tracking-widest'>
                {t("cart.order_summary") || "Order Summary"}
              </h2>

              <div className='space-y-3 text-sm'>
                {/* Subtotal */}
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t("cart.subtotal") || "Subtotal"}
                  </span>
                  <span className='font-semibold'>
                    {currency}
                    {totals.subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Promo code discount */}
                {totals.discount !== undefined && totals.discount > 0 && (
                  <div className='flex justify-between text-red-600'>
                    <span className='font-medium'>
                      {t("cart.discount") || "Discount"}
                    </span>
                    <span className='font-semibold'>
                      -{currency}
                      {totals.discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <AppliedOffersSavings
                  appliedOffers={appliedOffers}
                  currency={currency}
                />

                {/* Shipping */}
                {totals.shipping !== undefined && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      {t("cart.shipping") || "Shipping"}
                    </span>
                    <span className='font-semibold'>
                      {totals.shipping === 0
                        ? t("cart.free") || "Free"
                        : `${currency}${totals.shipping.toFixed(2)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className='border-t pt-4 flex justify-between items-center font-extrabold text-lg'>
                <span className='uppercase tracking-wide'>
                  {t("cart.total") || "Total"}
                </span>
                <span>
                  {currency}
                  {totals.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Trust signals — directly above Proceed to Checkout */}
              <div className='flex flex-wrap items-center justify-center gap-4 sm:gap-6 border-t border-stone-100 pt-4'>
                <div className='flex items-center gap-1.5'>
                  <Lock className='h-3.5 w-3.5 text-stone-400' />
                  <span className='text-[11px] tracking-wide text-stone-500'>
                    Secure Checkout
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <Truck className='h-3.5 w-3.5 text-stone-400' />
                  <span className='text-[11px] tracking-wide text-stone-500'>
                    Fast Delivery
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <RotateCcw className='h-3.5 w-3.5 text-stone-400' />
                  <span className='text-[11px] tracking-wide text-stone-500'>
                    Easy Returns
                  </span>
                </div>
              </div>

              {/* Proceed button — hidden on mobile (sticky bar handles it) */}
              <Button
                className='w-full font-bold tracking-wide uppercase hidden sm:flex'
                size='lg'
                onClick={onProceedToCheckout}
                disabled={isUpdating || items.length === 0}>
                {t("cart.proceed_to_checkout") || "Proceed to Checkout"}
                <ArrowRight className='w-4 h-4 ms-2' />
              </Button>

              {/* Divider */}
              <div className='hidden sm:flex items-center gap-3 text-xs text-muted-foreground'>
                <div className='flex-1 border-t' />
                <span>or</span>
                <div className='flex-1 border-t' />
              </div>

              {/* Continue shopping */}
              <Button
                variant='outline'
                className='w-full font-semibold'
                onClick={() => (window.location.href = "/shop")}>
                <ArrowLeft className='w-4 h-4 me-2' />
                {t("cart.continue_shopping") || "Continue Shopping"}
              </Button>

              {/* Payment logos */}
              <div className='pt-2 border-t flex items-center justify-center gap-2 flex-wrap'>
                <span className='text-xs text-muted-foreground mr-1'>
                  We accept
                </span>
                <span className='inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold text-blue-700 bg-white border-blue-200'>
                  VISA
                </span>
                <span className='inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold bg-white border-gray-200'>
                  <span className='text-red-500'>●</span>
                  <span className='text-yellow-500 -ms-1'>●</span>
                </span>
                <span className='inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold text-green-700 bg-white border-green-200'>
                  meeza
                </span>
                <span className='inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold bg-white border-gray-200'>
                  🍎 Pay
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trust badges (mobile only — appears after order summary) ── */}
        <div className='lg:hidden mt-8 pt-6 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs text-muted-foreground'>
          <div className='flex flex-col items-center gap-1.5'>
            <ShieldCheck className='w-5 h-5 text-muted-foreground/70' />
            <span>100% Authentic Products</span>
          </div>
          <div className='flex flex-col items-center gap-1.5'>
            <Lock className='w-5 h-5 text-muted-foreground/70' />
            <span>Secure Payments</span>
          </div>
          <div className='flex flex-col items-center gap-1.5'>
            <Truck className='w-5 h-5 text-muted-foreground/70' />
            <span>Fast &amp; Reliable Delivery</span>
          </div>
          <div className='flex flex-col items-center gap-1.5'>
            <RotateCcw className='w-5 h-5 text-muted-foreground/70' />
            <span>Easy Returns</span>
          </div>
        </div>

      </div>
    </div>

    {/* ── Mobile sticky checkout bar ─────────────────────────────────────── */}
    <div className='sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]'>
      <AppliedOffersSavings
        appliedOffers={appliedOffers}
        promoDiscount={totals.discount ?? 0}
        currency={currency}
        variant='sticky-banner'
      />
      <div className='px-4 py-3'>
        <div className='flex items-center justify-between mb-2.5'>
          <span className='text-xs text-muted-foreground uppercase tracking-widest font-semibold'>Total</span>
          <div className='text-right'>
            {totalSavings > 0 && (
              <p className='text-[10px] text-emerald-600 font-medium'>Saving {currency}{totalSavings.toFixed(2)}</p>
            )}
            <p className='text-base font-extrabold'>{currency}{totals.grandTotal.toFixed(2)}</p>
          </div>
        </div>
        <Button
          className='w-full font-bold tracking-wide uppercase'
          size='lg'
          onClick={onProceedToCheckout}
          disabled={isUpdating || items.length === 0}>
          {t("cart.proceed_to_checkout") || "Proceed to Checkout"}
          <ArrowRight className='w-4 h-4 ms-2' />
        </Button>
      </div>
    </div>
    </>
  );
}
