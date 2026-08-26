import React, { useEffect, useState } from "react";
import { Input } from "#root/components/ui/input";
import { Label } from "#root/components/ui/label";
import { Textarea } from "#root/components/ui/textarea";
import { Button } from "#root/components/ui/button";
import { Alert, AlertDescription } from "#root/components/ui/alert";
import {
  AlertCircle,
  ShoppingCart,
  User,
  MapPin,
  Loader2,
  CreditCard,
  Banknote,
  Wallet,
  Shield,
  Lock,
  Truck,
  RotateCcw,
  FileText,
} from "lucide-react";
import { useMinimalI18n } from "#root/lib/i18n/MinimalI18nContext";
import {
  BostaShippingFields,
  type BostaShippingSelection,
} from "#root/components/checkout/BostaShippingFields";
import { OfferProgressBanner } from "#root/components/template-system/cartPage/OfferProgressBanner";
import {
  AppliedOffersSavings,
} from "#root/components/template-system/cartPage/AppliedOffersSavings";

/**
 * Customer information interface
 */
export interface CheckoutCustomerInfo {
  name: string;
  email: string;
  phone?: string | null;
}

/**
 * Address interface
 */
export interface CheckoutAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

/**
 * Order summary item interface
 */
export interface CheckoutOrderSummaryItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  variant?: string | null;
}

/**
 * Checkout totals interface
 */
export interface CheckoutTotals {
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
 * Payment method option from the server
 */
export interface PaymentMethodOption {
  id: string;
  label: string;
  description: string;
}

/**
 * Props for CheckoutPageModernTemplate
 */
export interface CheckoutPageModernTemplateProps {
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
  /** Available payment methods (fetched from server). If undefined/empty, only COD is shown */
  paymentMethods?: PaymentMethodOption[];
  /** Whether payment methods are loading */
  paymentMethodsLoading?: boolean;
  /** When true, city/zone/district come from Bosta API pickers */
  bostaShippingEnabled?: boolean;
}

/**
 * CheckoutPageModernTemplate Component
 *
 * Modern checkout page layout with form fields, order review and submission
 */
export function CheckoutPageModernTemplate({
  customer,
  shippingAddress,
  billingAddress,
  items = [],
  totals,
  isSubmitting = false,
  errorMessage = null,
  onSubmit,
  onEditCart,
  currency = "EGP",
  paymentMethods,
  paymentMethodsLoading = false,
  bostaShippingEnabled = false,
}: CheckoutPageModernTemplateProps) {
  const { t } = useMinimalI18n();
  const [bostaSelection, setBostaSelection] =
    useState<BostaShippingSelection | null>(null);
  const [form, setForm] = useState({
    fullName: customer?.name ?? "",
    email: customer?.email ?? "",
    phoneNumber: customer?.phone ?? "",
    address: shippingAddress?.line1 ?? "",
    city: shippingAddress?.city ?? "",
    state: shippingAddress?.state ?? "",
    postalCode: "00000",
    country: shippingAddress?.country ?? "Egypt",
    notes: "",
    paymentMethod: "cod",
    bostaDistrictId: "",
    buildingNumber: "",
    apartment: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notesOpen, setNotesOpen] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.fullName.trim()) errors.fullName = t("validation.name_required");
    if (!form.email.trim()) {
      errors.email = t("validation.email_required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = t("validation.email_invalid");
    }
    if (!form.phoneNumber.trim()) {
      errors.phoneNumber = t("validation.phone_required");
    } else if (!/^[\d\s+()-]{7,20}$/.test(form.phoneNumber.trim())) {
      errors.phoneNumber = t("validation.phone_invalid");
    }
    if (!form.address.trim()) errors.address = t("validation.address_required");
    else if (form.address.trim().length < 5) {
      errors.address = "Please enter a full street address (at least 5 characters)";
    }
    if (bostaShippingEnabled) {
      if (!bostaSelection?.districtId) {
        errors.bostaDistrict = "Please select city, area, and district";
      }
      if (!form.buildingNumber.trim()) {
        errors.buildingNumber =
          t("validation.building_required") || "Building number is required";
      }
      if (!form.apartment.trim()) {
        errors.apartment =
          t("validation.apartment_required") || "Apartment number is required";
      }
    } else {
      if (!form.city.trim()) errors.city = t("validation.city_required");
    }
    if (!form.country.trim()) errors.country = t("validation.country_required");

    setFieldErrors(errors);

    // Scroll to first error field
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const el = document.getElementById(firstErrorField!);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus();
      }
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = bostaShippingEnabled && bostaSelection
      ? {
          ...form,
          city: bostaSelection.city,
          state: bostaSelection.zone,
          bostaDistrictId: bostaSelection.districtId,
        }
      : form;
    onSubmit?.(payload);
  };

  // Resolved payment methods (with COD fallback when none provided)
  const methods =
    paymentMethods && paymentMethods.length > 0
      ? paymentMethods
      : [
          {
            id: "cod",
            label: "Cash on Delivery",
            description: "Pay when your order is delivered to your doorstep",
          },
        ];

  const getPaymentIcon = (id: string) => {
    switch (id) {
      case "stripe":
        return <CreditCard className='w-5 h-5' />;
      case "paymob":
        return <Wallet className='w-5 h-5' />;
      default:
        return <Banknote className='w-5 h-5' />;
    }
  };

  // Auto-select the only payment method when there's exactly one
  useEffect(() => {
    if (methods.length === 1 && form.paymentMethod !== methods[0]!.id) {
      updateField("paymentMethod", methods[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods, form.paymentMethod]);

  const appliedOffers = totals.appliedOffers ?? [];
  const cartSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartQuantity = items.reduce((s, i) => s + i.quantity, 0);

  // Section number component
  const SectionNum = ({ n }: { n: number }) => (
    <span className='flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-xs font-bold shrink-0'>
      {n}
    </span>
  );

  return (
    <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12'>
      <h1 className='text-2xl sm:text-3xl font-extrabold mb-8'>
        {t("checkout.title") || "Checkout"}
      </h1>

      {errorMessage && (
        <Alert variant='destructive' className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {Object.keys(fieldErrors).length > 0 && (
        <Alert variant='destructive' className='mb-6'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{t("validation.fix_errors")}</AlertDescription>
        </Alert>
      )}

      <OfferProgressBanner
        cartSubtotal={cartSubtotal}
        cartQuantity={cartQuantity}
        appliedOffers={appliedOffers}
        currency={currency}
      />

      <form onSubmit={handleSubmit}>
        <div className='grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10'>
          {/* ── Left column: form sections ─────────────────── */}
          <div className='space-y-6'>
            {/* 1. Customer Information */}
            <div className='border rounded-2xl p-6'>
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <SectionNum n={1} />
                  <h2 className='font-bold text-base'>
                    {t("checkout.customer_info") || "Customer Information"}
                  </h2>
                </div>
                <User className='w-5 h-5 text-muted-foreground' />
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='fullName'>
                      {t("checkout.full_name") || "Full Name"}{" "}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='fullName'
                      placeholder='John Doe'
                      value={form.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className={
                        fieldErrors.fullName ? "border-destructive" : ""
                      }
                    />
                    {fieldErrors.fullName && (
                      <p className='text-xs text-destructive'>
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='email'>
                      {t("checkout.email") || "Email Address"}{" "}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='john@example.com'
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className='text-xs text-destructive'>
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='phoneNumber'>
                    {t("checkout.phone") || "Phone Number"}{" "}
                    <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='phoneNumber'
                    type='tel'
                    placeholder='+20 1XX XXX XXXX'
                    value={form.phoneNumber}
                    onChange={(e) => updateField("phoneNumber", e.target.value)}
                    className={
                      fieldErrors.phoneNumber ? "border-destructive" : ""
                    }
                  />
                  {fieldErrors.phoneNumber && (
                    <p className='text-xs text-destructive'>
                      {fieldErrors.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className='border rounded-2xl p-6'>
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <SectionNum n={2} />
                  <h2 className='font-bold text-base'>
                    {t("checkout.shipping_address") || "Shipping Address"}
                  </h2>
                </div>
                <MapPin className='w-5 h-5 text-muted-foreground' />
              </div>
              <div className='space-y-4'>
                <div className='space-y-1.5'>
                  <Label htmlFor='address'>
                    {t("checkout.street") || "Street Address"}{" "}
                    <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    id='address'
                    placeholder='123 Main St, Apt 4B'
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className={fieldErrors.address ? "border-destructive" : ""}
                  />
                  {fieldErrors.address && (
                    <p className='text-xs text-destructive'>
                      {fieldErrors.address}
                    </p>
                  )}
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {bostaShippingEnabled ? (
                    <div className='sm:col-span-2'>
                      <BostaShippingFields
                        value={bostaSelection}
                        onChange={setBostaSelection}
                        error={fieldErrors.bostaDistrict}
                      />
                    </div>
                  ) : (
                    <>
                      <div className='space-y-1.5'>
                        <Label htmlFor='city'>
                          {t("checkout.city") || "City"}{" "}
                          <span className='text-destructive'>*</span>
                        </Label>
                        <Input
                          id='city'
                          placeholder='Cairo'
                          value={form.city}
                          onChange={(e) => updateField("city", e.target.value)}
                          className={fieldErrors.city ? "border-destructive" : ""}
                        />
                        {fieldErrors.city && (
                          <p className='text-xs text-destructive'>
                            {fieldErrors.city}
                          </p>
                        )}
                      </div>
                      <div className='space-y-1.5'>
                        <Label htmlFor='state'>
                          {t("checkout.state") || "State / Governorate"}
                        </Label>
                        <Input
                          id='state'
                          placeholder='Cairo'
                          value={form.state}
                          onChange={(e) => updateField("state", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {bostaShippingEnabled && (
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='buildingNumber'>
                        {t("checkout.building_number") || "Building Number"}{" "}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='buildingNumber'
                        placeholder='117B'
                        value={form.buildingNumber}
                        onChange={(e) =>
                          updateField("buildingNumber", e.target.value)
                        }
                        className={
                          fieldErrors.buildingNumber ? "border-destructive" : ""
                        }
                      />
                      {fieldErrors.buildingNumber && (
                        <p className='text-xs text-destructive'>
                          {fieldErrors.buildingNumber}
                        </p>
                      )}
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='apartment'>
                        {t("checkout.apartment") || "Apartment / Unit"}{" "}
                        <span className='text-destructive'>*</span>
                      </Label>
                      <Input
                        id='apartment'
                        placeholder='4B'
                        value={form.apartment}
                        onChange={(e) => updateField("apartment", e.target.value)}
                        className={fieldErrors.apartment ? "border-destructive" : ""}
                      />
                      {fieldErrors.apartment && (
                        <p className='text-xs text-destructive'>
                          {fieldErrors.apartment}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <div className='space-y-1.5'>
                  <Label htmlFor='country'>
                    {t("checkout.country") || "Country"}{" "}
                    <span className='text-destructive'>*</span>
                  </Label>
                  <select
                    id='country'
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${fieldErrors.country ? "border-destructive" : "border-input"}`}>
                    <option value='Egypt'>Egypt</option>
                    <option value='Saudi Arabia'>Saudi Arabia</option>
                    <option value='UAE'>UAE</option>
                    <option value='Kuwait'>Kuwait</option>
                    <option value='Qatar'>Qatar</option>
                    <option value='Bahrain'>Bahrain</option>
                    <option value='Oman'>Oman</option>
                    <option value='Jordan'>Jordan</option>
                    <option value='Lebanon'>Lebanon</option>
                    <option value='Other'>Other</option>
                  </select>
                  {fieldErrors.country && (
                    <p className='text-xs text-destructive'>
                      {fieldErrors.country}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Notes — inline collapsible, not numbered */}
            <div className='px-1'>
              {!notesOpen ? (
                <button
                  type='button'
                  onClick={() => setNotesOpen(true)}
                  className='text-sm text-stone-500 hover:text-stone-700 underline underline-offset-4'>
                  + Add special instructions (optional)
                </button>
              ) : (
                <Textarea
                  placeholder={
                    t("checkout.notes_placeholder") ||
                    "Any special instructions for your order\u2026"
                  }
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                />
              )}
            </div>

            {/* 3. Payment Method */}
            <div className='border rounded-2xl p-6'>
              <div className='flex items-center justify-between mb-5'>
                <div className='flex items-center gap-3'>
                  <SectionNum n={3} />
                  <h2 className='font-bold text-base'>
                    {t("checkout.payment_method") || "Payment Method"}
                  </h2>
                </div>
                <Lock className='w-5 h-5 text-muted-foreground' />
              </div>
              {paymentMethodsLoading ? (
                <div className='flex items-center gap-2 text-muted-foreground py-2'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  {t("checkout.loading_payment") ||
                    "Loading payment options..."}
                </div>
              ) : (
                <div className='space-y-3'>
                  {methods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        form.paymentMethod === method.id
                          ? "border-green-600 bg-muted/40"
                          : "border-border hover:border-muted-foreground/40"
                      }`}>
                      <input
                        type='radio'
                        name='paymentMethod'
                        value={method.id}
                        checked={form.paymentMethod === method.id}
                        onChange={(e) =>
                          updateField("paymentMethod", e.target.value)
                        }
                        className='mt-1 accent-foreground'
                      />
                      <div className='flex items-start gap-3 flex-1'>
                        <div
                          className={`mt-0.5 ${form.paymentMethod === method.id ? "text-foreground" : "text-muted-foreground"}`}>
                          {getPaymentIcon(method.id)}
                        </div>
                        <div className='flex-1'>
                          <p className='font-semibold'>{method.label}</p>
                          <p className='text-sm text-muted-foreground'>
                            {method.description}
                          </p>
                        </div>
                      </div>
                      {method.id !== "cod" && (
                        <div className='flex items-center gap-1 text-xs text-green-600 shrink-0 mt-1'>
                          <Shield className='w-3 h-3' />
                          {t("checkout.secure") || "SECURE"}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: Order Summary ────────────────── */}
          <div className='lg:sticky lg:top-6 lg:self-start w-full'>
            <div className='border rounded-2xl p-6 space-y-5 w-full'>
              <h2 className='font-extrabold text-base uppercase tracking-widest'>
                {t("checkout.order_summary") || "Order Summary"}
              </h2>

              {/* Items */}
              <div className='space-y-4'>
                {items.map((item) => (
                  <div key={item.id} className='flex items-center gap-3'>
                    <div className='w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted border'>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <ShoppingCart className='w-4 h-4 text-muted-foreground/30' />
                        </div>
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='font-semibold text-sm leading-snug truncate'>
                        {item.name}
                      </p>
                      {item.variant && (
                        <p className='text-xs text-muted-foreground truncate'>
                          {item.variant}
                        </p>
                      )}
                      <p className='text-xs text-muted-foreground'>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className='font-semibold text-sm shrink-0'>
                      {currency}
                      {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                {onEditCart && (
                  <button
                    type='button'
                    onClick={onEditCart}
                    className='text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors'>
                    {t("checkout.edit_cart") || "Edit cart"}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className='border-t' />

              {/* Totals */}
              <div className='space-y-2.5 text-xs w-full'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t("cart.subtotal") || "Subtotal"}
                  </span>
                  <span className='font-semibold'>
                    {currency}
                    {totals.subtotal.toFixed(2)}
                  </span>
                </div>
                {totals.discount !== undefined && totals.discount > 0 && (
                  <div className='flex justify-between text-red-600'>
                    <span className='font-medium'>
                      {t("cart.discount") || "Discount"}
                    </span>
                    <span className='font-semibold'>
                      - {currency}
                      {totals.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <AppliedOffersSavings
                  appliedOffers={appliedOffers}
                  currency={currency}
                />
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

              {/* Grand total */}
              <div className='border-t pt-4 flex justify-between items-center'>
                <span className='font-bold text-base uppercase tracking-wide'>
                  {t("cart.total") || "Total"}
                </span>
                <span className='font-extrabold text-xl text-emerald-600'>
                  {currency} {totals.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Trust badges */}
              <div className='space-y-2.5 text-sm text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <Lock className='w-4 h-4 shrink-0' />
                  <div>
                    <p className='font-medium text-foreground text-xs'>
                      Secure Checkout
                    </p>
                    <p className='text-xs'>
                      Your payment information is safe with us.
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Truck className='w-4 h-4 shrink-0' />
                  <div>
                    <p className='font-medium text-foreground text-xs'>
                      Fast Delivery
                    </p>
                    <p className='text-xs'>Quick delivery to your doorstep.</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <RotateCcw className='w-4 h-4 shrink-0' />
                  <div>
                    <p className='font-medium text-foreground text-xs'>
                      Easy Returns
                    </p>
                    <p className='text-xs'>14-day return policy.</p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type='submit'
                className='w-full font-bold tracking-wide uppercase'
                size='lg'
                disabled={isSubmitting || items.length === 0}>
                {isSubmitting ? (
                  <span className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    {t("checkout.processing") || "Processing..."}
                  </span>
                ) : (
                  <span className='flex items-center gap-2'>
                    <Lock className='w-4 h-4' />
                    {form.paymentMethod === "cod"
                      ? t("checkout.place_order") || "Place Order"
                      : t("checkout.place_order_pay") || "Place Order & Pay"}
                  </span>
                )}
              </Button>

              <p className='text-xs text-center text-muted-foreground'>
                {t("checkout.terms") || (
                  <>
                    By placing your order, you agree to our{" "}
                    <a
                      href='/links'
                      className='underline underline-offset-2 text-foreground'>
                      Terms &amp; Conditions
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
