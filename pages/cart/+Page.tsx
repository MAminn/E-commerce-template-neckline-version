"use client";

import { useState, useMemo } from "react";
import { useTemplate } from "#root/frontend/contexts/TemplateContext";
import { useCart } from "#root/lib/context/CartContext";
import { getTemplateComponent } from "#root/components/template-system/templateConfig";
import type {
  CartPageModernTemplateProps,
  CartPageCartItem,
  CartPageTotals,
} from "#root/components/template-system";
import { navigate } from "vike/client/router";

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,
    subtotal,
    discount,
    total,
    promoCode,
    applyPromoCode,
    removePromoCode,
    shipping,
    appliedOffers,
  } = useCart();
  const { getTemplateId } = useTemplate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create a stable key for each cart item (product ID + selected options)
  const getCartItemKey = (item: (typeof items)[number]) => {
    const opts = item.selectedOptions;
    if (opts && Object.keys(opts).length > 0) {
      return `${item.id}|${JSON.stringify(opts)}`;
    }
    return item.id;
  };

  // Transform cart items to new template format
  const cartItems: CartPageCartItem[] = useMemo(() => {
    return items.map((item) => ({
      id: getCartItemKey(item),
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice ?? undefined,
      quantity: item.quantity,
      imageUrl: item.imageUrl ?? undefined,
      variant: item.selectedOptions
        ? Object.entries(item.selectedOptions)
            .map(([key, value]) => `${key}: ${value}`)
            .join(", ") || undefined
        : undefined,
      stock: item.stock || 0,
      available: (item.stock || 0) > 0,
    }));
  }, [items]);

  // Find the original cart item by its composite key
  const findCartItem = (cartItemKey: string) => {
    return items.find((item) => getCartItemKey(item) === cartItemKey);
  };

  // Build totals object
  const totals: CartPageTotals = useMemo(() => {
    return {
      subtotal,
      discount: discount > 0 ? discount : undefined,
      shipping: shipping > 0 ? shipping : undefined,
      grandTotal: total,
      appliedOffers: appliedOffers.length > 0 ? appliedOffers : undefined,
    };
  }, [subtotal, discount, shipping, total, appliedOffers]);

  // Handle quantity change
  const handleQuantityChange = (
    cartItemKey: string,
    newQuantity: number,
  ): void => {
    setIsUpdating(true);
    const item = findCartItem(cartItemKey);
    if (item) {
      const success = updateQuantity(
        item.id,
        newQuantity,
        item.selectedOptions,
      );
      if (!success) {
        console.error("Failed to update quantity");
      }
    }
    setIsUpdating(false);
  };

  // Handle remove item
  const handleRemoveItem = (cartItemKey: string): void => {
    setIsUpdating(true);
    const item = findCartItem(cartItemKey);
    if (item) {
      removeItem(item.id, item.selectedOptions);
    }
    setIsUpdating(false);
  };

  // Handle apply coupon
  const handleApplyCoupon = async (code: string): Promise<boolean> => {
    setIsUpdating(true);
    const success = await applyPromoCode(code);
    setIsUpdating(false);
    return success;
  };

  // Handle proceed to checkout
  const handleProceedToCheckout = (): void => {
    navigate("/checkout");
  };

  // Get template component
  const templateId = getTemplateId("cartPage");
  const Template = getTemplateComponent(
    "cartPage",
    templateId || "cart-modern",
  );

  if (!Template) {
    return <div>Template not found: {templateId}</div>;
  }

  const templateProps: CartPageModernTemplateProps = {
    items: cartItems,
    totals,
    isLoading,
    isUpdating,
    currency: "EGP",
    onQuantityChange: handleQuantityChange,
    onRemoveItem: handleRemoveItem,
    onApplyCoupon: handleApplyCoupon,
    onProceedToCheckout: handleProceedToCheckout,
  };

  return <Template.component {...templateProps} />;
}
