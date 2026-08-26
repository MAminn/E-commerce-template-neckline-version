import React, { useState } from "react";
import { Button } from "#root/components/ui/button";
import { Input } from "#root/components/ui/input";
import { Label } from "#root/components/ui/label";
import { Skeleton } from "#root/components/ui/skeleton";
import { Alert, AlertDescription } from "#root/components/ui/alert";
import { AlertCircle, Loader2, Shield, ChevronLeft } from "lucide-react";
import type {
  CheckoutCustomerInfo,
  CheckoutAddress,
  CheckoutOrderSummaryItem,
  CheckoutTotals,
  PaymentMethodOption,
} from "./CheckoutPageModernTemplate";
import { EditorialChrome } from "../editorial/EditorialChrome";
import { Reveal } from "../motion/Reveal";
import { StaggerContainer, StaggerItem } from "../motion/Stagger";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface CheckoutPageEditorialTemplateProps {
  customer?: CheckoutCustomerInfo;
  shippingAddress?: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  items: CheckoutOrderSummaryItem[];
  totals: CheckoutTotals;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit?: (formValues: Record<string, string>) => void | Promise<void>;
  onEditCart?: () => void;
  currency?: string;
  paymentMethods?: PaymentMethodOption[];
  paymentMethodsLoading?: boolean;
  bostaShippingEnabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatPrice(v: number, currency = "EGP"): string {
  return `${currency} ${v.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function CheckoutPageEditorialTemplate({
  customer,
  shippingAddress,
  items = [],
  totals,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  onEditCart,
  currency = "EGP",
  paymentMethods,
  paymentMethodsLoading = false,
}: CheckoutPageEditorialTemplateProps) {
  /* Internal form state — mirrors the Modern template pattern */
  const [formValues, setFormValues] = useState<Record<string, string>>({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address_line1: shippingAddress?.line1 ?? "",
    address_line2: shippingAddress?.line2 ?? "",
    city: shippingAddress?.city ?? "",
    state: shippingAddress?.state ?? "",
    postalCode: shippingAddress?.postalCode ?? "",
    country: shippingAddress?.country ?? "Egypt",
    paymentMethod: paymentMethods?.[0]?.id ?? "cod",
    notes: "",
  });

  const updateField = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formValues);
  };

  /* Pill-style input classes */
  const inputCls =
    "h-11 rounded-full border-stone-200 bg-white text-sm px-5 focus-visible:ring-2 focus-visible:ring-stone-900/15 focus-visible:ring-offset-0";

  return (
    <EditorialChrome>
      <div className='min-h-screen bg-stone-50'>
        <div className='mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10'>
          {/* Header */}
          <Reveal variant='fadeUp'>
            <div className='mb-10 flex items-center justify-between'>
              <div>
                <p className='text-xs tracking-[0.32em] uppercase text-stone-500'>
                  Checkout
                </p>
                <h1 className='mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl'>
                  Complete Your Order
                </h1>
              </div>
              {onEditCart && (
                <button
                  type='button'
                  onClick={onEditCart}
                  className='inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors'>
                  <ChevronLeft className='h-3.5 w-3.5' />
                  Edit Bag
                </button>
              )}
            </div>
          </Reveal>

          {/* Error */}
          {errorMessage && (
            <Alert variant='destructive' className='mb-8 rounded-xl'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-1 gap-10 lg:grid-cols-12'>
              {/* ====================================================== */}
              {/*  LEFT — Form                                            */}
              {/* ====================================================== */}
              <StaggerContainer className='lg:col-span-7 space-y-8'>
                {/* Customer Info */}
                <StaggerItem>
                  <section className='rounded-2xl border border-stone-200 bg-white p-6'>
                    <h2 className='text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-5'>
                      Contact Information
                    </h2>
                    <div className='space-y-4'>
                      <div>
                        <Label
                          htmlFor='checkout-name'
                          className='text-xs text-stone-500 mb-1.5 block'>
                          Full Name *
                        </Label>
                        <Input
                          id='checkout-name'
                          required
                          value={formValues.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className={inputCls}
                          placeholder='Your full name'
                        />
                      </div>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                          <Label
                            htmlFor='checkout-email'
                            className='text-xs text-stone-500 mb-1.5 block'>
                            Email *
                          </Label>
                          <Input
                            id='checkout-email'
                            type='email'
                            required
                            value={formValues.email}
                            onChange={(e) =>
                              updateField("email", e.target.value)
                            }
                            className={inputCls}
                            placeholder='you@email.com'
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor='checkout-phone'
                            className='text-xs text-stone-500 mb-1.5 block'>
                            Phone
                          </Label>
                          <Input
                            id='checkout-phone'
                            type='tel'
                            value={formValues.phone}
                            onChange={(e) =>
                              updateField("phone", e.target.value)
                            }
                            className={inputCls}
                            placeholder='+20 xxx xxx xxxx'
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </StaggerItem>

                {/* Shipping Address */}
                <StaggerItem>
                  <section className='rounded-2xl border border-stone-200 bg-white p-6'>
                    <h2 className='text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-5'>
                      Shipping Address
                    </h2>
                    <div className='space-y-4'>
                      <div>
                        <Label
                          htmlFor='checkout-address1'
                          className='text-xs text-stone-500 mb-1.5 block'>
                          Address Line 1 *
                        </Label>
                        <Input
                          id='checkout-address1'
                          required
                          value={formValues.address_line1}
                          onChange={(e) =>
                            updateField("address_line1", e.target.value)
                          }
                          className={inputCls}
                          placeholder='Street address'
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor='checkout-address2'
                          className='text-xs text-stone-500 mb-1.5 block'>
                          Address Line 2
                        </Label>
                        <Input
                          id='checkout-address2'
                          value={formValues.address_line2}
                          onChange={(e) =>
                            updateField("address_line2", e.target.value)
                          }
                          className={inputCls}
                          placeholder='Apt, suite, etc. (optional)'
                        />
                      </div>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                        <div>
                          <Label
                            htmlFor='checkout-city'
                            className='text-xs text-stone-500 mb-1.5 block'>
                            City *
                          </Label>
                          <Input
                            id='checkout-city'
                            required
                            value={formValues.city}
                            onChange={(e) =>
                              updateField("city", e.target.value)
                            }
                            className={inputCls}
                            placeholder='City'
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor='checkout-state'
                            className='text-xs text-stone-500 mb-1.5 block'>
                            State
                          </Label>
                          <Input
                            id='checkout-state'
                            value={formValues.state}
                            onChange={(e) =>
                              updateField("state", e.target.value)
                            }
                            className={inputCls}
                            placeholder='State'
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor='checkout-postal'
                            className='text-xs text-stone-500 mb-1.5 block'>
                            Postal Code
                          </Label>
                          <Input
                            id='checkout-postal'
                            value={formValues.postalCode}
                            onChange={(e) =>
                              updateField("postalCode", e.target.value)
                            }
                            className={inputCls}
                            placeholder='12345'
                          />
                        </div>
                      </div>
                      <div>
                        <Label
                          htmlFor='checkout-country'
                          className='text-xs text-stone-500 mb-1.5 block'>
                          Country
                        </Label>
                        <Input
                          id='checkout-country'
                          value={formValues.country}
                          onChange={(e) =>
                            updateField("country", e.target.value)
                          }
                          className={inputCls}
                          placeholder='Country'
                        />
                      </div>
                    </div>
                  </section>
                </StaggerItem>

                {/* Payment Method */}
                <StaggerItem>
                  <section className='rounded-2xl border border-stone-200 bg-white p-6'>
                    <h2 className='text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-5'>
                      Payment Method
                    </h2>
                    {paymentMethodsLoading ? (
                      <div className='space-y-3'>
                        <Skeleton className='h-12 w-full rounded-xl' />
                        <Skeleton className='h-12 w-full rounded-xl' />
                      </div>
                    ) : paymentMethods && paymentMethods.length > 0 ? (
                      <div className='space-y-2'>
                        {paymentMethods.map((pm) => (
                          <label
                            key={pm.id}
                            className={`flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                              formValues.paymentMethod === pm.id
                                ? "border-stone-900 bg-stone-50"
                                : "border-stone-200 bg-white hover:border-stone-300"
                            }`}>
                            <input
                              type='radio'
                              name='paymentMethod'
                              value={pm.id}
                              checked={formValues.paymentMethod === pm.id}
                              onChange={(e) =>
                                updateField("paymentMethod", e.target.value)
                              }
                              className='h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900/20'
                            />
                            <div className='flex-1'>
                              <p className='text-sm font-medium text-stone-900'>
                                {pm.label}
                              </p>
                              {pm.description && (
                                <p className='text-xs text-stone-500'>
                                  {pm.description}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <label className='flex cursor-pointer items-center gap-4 rounded-xl border border-stone-900 bg-stone-50 px-5 py-4'>
                        <input
                          type='radio'
                          name='paymentMethod'
                          value='cod'
                          checked
                          readOnly
                          className='h-4 w-4 border-stone-300 text-stone-900'
                        />
                        <div>
                          <p className='text-sm font-medium text-stone-900'>
                            Cash on Delivery
                          </p>
                          <p className='text-xs text-stone-500'>
                            Pay when you receive your order
                          </p>
                        </div>
                      </label>
                    )}
                  </section>
                </StaggerItem>

                {/* Order Notes */}
                <StaggerItem>
                  <section className='rounded-2xl border border-stone-200 bg-white p-6'>
                    <h2 className='text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-5'>
                      Order Notes (Optional)
                    </h2>
                    <textarea
                      value={formValues.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder='Any special instructions…'
                      rows={3}
                      className='w-full rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-900 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-900/15'
                    />
                  </section>
                </StaggerItem>
              </StaggerContainer>

              {/* ====================================================== */}
              {/*  RIGHT — Order Summary                                  */}
              {/* ====================================================== */}
              <Reveal variant='fadeUp' delay={0.2} className='lg:col-span-5'>
                <div className='lg:sticky lg:top-24 rounded-2xl border border-stone-200 bg-white p-6'>
                  <h2 className='text-sm font-medium tracking-[0.2em] uppercase text-stone-500 mb-5'>
                    Order Summary
                  </h2>

                  {/* Items */}
                  <div className='space-y-4 max-h-60 overflow-y-auto'>
                    {items.map((item) => (
                      <div key={item.id} className='flex justify-between gap-3'>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm text-stone-900 line-clamp-1'>
                            {item.name}
                          </p>
                          {item.variant && (
                            <p className='text-xs text-stone-400'>
                              {item.variant}
                            </p>
                          )}
                          <p className='text-xs text-stone-500'>
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className='text-sm font-medium text-stone-900 shrink-0'>
                          {formatPrice(item.price * item.quantity, currency)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className='mt-5 h-px w-full bg-stone-200' />

                  {/* Totals */}
                  <div className='mt-4 space-y-3 text-sm'>
                    <div className='flex justify-between text-stone-600'>
                      <span>Subtotal</span>
                      <span>{formatPrice(totals.subtotal, currency)}</span>
                    </div>
                    {totals.discount != null && totals.discount > 0 && (
                      <div className='flex justify-between text-stone-600'>
                        <span>Discount</span>
                        <span className='text-green-700'>
                          −{formatPrice(totals.discount, currency)}
                        </span>
                      </div>
                    )}
                    {totals.appliedOffers && totals.appliedOffers.map((offer) => (
                      <div key={offer.name} className='flex items-start justify-between gap-2 text-red-600'>
                        <span className='flex items-center gap-1 font-medium min-w-0'>
                          🎁 <span className='truncate'>{offer.name}</span>
                        </span>
                        <span className='font-semibold shrink-0'>
                          {offer.freeShipping && offer.discountAmount === 0
                            ? "Free shipping"
                            : `−${formatPrice(offer.discountAmount, currency)}`}
                        </span>
                      </div>
                    ))}
                    {totals.shipping != null && (
                      <div className='flex justify-between text-stone-600'>
                        <span>Shipping</span>
                        <span>
                          {totals.shipping === 0
                            ? "Free"
                            : formatPrice(totals.shipping, currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className='mt-4 h-px w-full bg-stone-200' />

                  <div className='mt-4 flex justify-between text-base font-semibold text-stone-900'>
                    <span>Total</span>
                    <span>{formatPrice(totals.grandTotal, currency)}</span>
                  </div>

                  {/* Submit */}
                  <Button
                    type='submit'
                    size='lg'
                    className='mt-6 w-full rounded-full py-6 text-sm tracking-wide'
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='me-2 h-4 w-4 animate-spin' />
                        Processing…
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </Button>

                  {/* Security note */}
                  <div className='mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-400'>
                    <Shield className='h-3 w-3' />
                    <span>Secure checkout</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </form>
        </div>
      </div>
    </EditorialChrome>
  );
}

CheckoutPageEditorialTemplate.displayName = "CheckoutPageEditorialTemplate";
