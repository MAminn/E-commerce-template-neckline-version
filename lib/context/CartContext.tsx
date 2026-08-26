import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Product } from "../mock-data/products";
import { trpc } from "#root/shared/trpc/client";
import type { AppliedOffer } from "#root/backend/offers/service";

export interface CartItem extends Product {
  quantity: number;
  selectedOptions: Record<string, string>;
}

export interface PromoCodeInfo {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  appliesToAllProducts: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    item: Product,
    quantity: number,
    selectedOptions: CartItem["selectedOptions"],
  ) => boolean;
  removeItem: (itemId: string, options?: CartItem["selectedOptions"]) => void;
  updateQuantity: (
    itemId: string,
    quantity: number,
    options?: CartItem["selectedOptions"],
  ) => boolean;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promoCode: PromoCodeInfo | null;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: () => void;
  findItemInCart: (
    itemId: string,
    options: CartItem["selectedOptions"],
  ) => CartItem | undefined;
  appliedOffers: AppliedOffer[];
  offerDiscount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<PromoCodeInfo | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [appliedOffers, setAppliedOffers] = useState<AppliedOffer[]>([]);
  const [offerDiscount, setOfferDiscount] = useState<number>(0);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error("Failed to parse cart from localStorage");
        localStorage.removeItem("cart");
      }
    }

    const savedPromoCode = localStorage.getItem("promoCode");
    if (savedPromoCode) {
      try {
        const parsedPromoCode = JSON.parse(savedPromoCode);
        // Re-validate the promo code against backend to check if it's still active/not expired
        const savedCartItems = savedCart ? JSON.parse(savedCart) : [];
        const cartItems = savedCartItems.map((item: CartItem) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
        }));
        const cartSubtotal = savedCartItems.reduce(
          (total: number, item: CartItem) => total + item.price * item.quantity,
          0,
        );
        trpc.promoCode.validate
          .query({
            code: parsedPromoCode.code,
            cartItems,
            subtotal: cartSubtotal,
          })
          .then((result) => {
            if (result.success && result.result) {
              setPromoCode(result.result);
            } else {
              setPromoCode(null);
              localStorage.removeItem("promoCode");
            }
          })
          .catch(() => {
            setPromoCode(null);
            localStorage.removeItem("promoCode");
          });
      } catch (error) {
        console.error("Failed to parse promo code from localStorage");
        localStorage.removeItem("promoCode");
      }
    }

    // Fetch shipping fee from backend
    trpc.settings.getShippingFee
      .query()
      .then((result) => {
        if (result.success) {
          setShipping(result.result);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch shipping fee:", err);
      });
  }, []);

  // Calculate subtotal
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));

    // Recalculate promo discount when items change
    if (promoCode) {
      calculateDiscount(promoCode);
    }

    // Re-evaluate automatic offers when cart changes
    const cartItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    const currentSubtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
    if (cartItems.length > 0) {
      trpc.offer.evaluate
        .query({ cartItems, subtotal: currentSubtotal })
        .then((result) => {
          if (result.success && result.result) {
            setAppliedOffers(result.result);
            const totalOfferDiscount = result.result.reduce((s, o) => s + o.discountAmount, 0);
            setOfferDiscount(totalOfferDiscount);
            // If any offer gives free shipping, zero out shipping
            const hasFreeShipping = result.result.some((o) => o.freeShipping);
            if (hasFreeShipping) setShipping(0);
          } else {
            setAppliedOffers([]);
            setOfferDiscount(0);
          }
        })
        .catch(() => {
          setAppliedOffers([]);
          setOfferDiscount(0);
        });
    } else {
      setAppliedOffers([]);
      setOfferDiscount(0);
    }
  }, [items, promoCode]);

  useEffect(() => {
    if (promoCode) {
      localStorage.setItem("promoCode", JSON.stringify(promoCode));
      calculateDiscount(promoCode);
    } else {
      localStorage.removeItem("promoCode");
      setDiscount(0);
    }
  }, [promoCode]);

  const calculateDiscount = (promoCodeInfo: PromoCodeInfo) => {
    if (promoCodeInfo.discountType === "percentage") {
      setDiscount(subtotal * (promoCodeInfo.discountValue / 100));
    } else if (promoCodeInfo.discountType === "fixed_amount") {
      let calculatedDiscount = promoCodeInfo.discountValue;
      // Make sure the discount doesn't exceed the subtotal
      if (calculatedDiscount > subtotal) {
        calculatedDiscount = subtotal;
      }
      setDiscount(calculatedDiscount);
    }
  };

  const findItemInCart = (
    itemId: string,
    options: CartItem["selectedOptions"],
  ) => {
    return items.find(
      (item) =>
        item.id === itemId &&
        JSON.stringify(item.selectedOptions) === JSON.stringify(options),
    );
  };

  const addItem = (
    product: Product,
    quantity: number,
    selectedOptions: CartItem["selectedOptions"],
  ) => {
    if (!product.stock || product.stock < quantity) {
      return false;
    }

    const existingItemIndex = items.findIndex(
      (item) =>
        item.id === product.id &&
        JSON.stringify(item.selectedOptions) ===
          JSON.stringify(selectedOptions),
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      const existingItem = updatedItems[existingItemIndex];

      if (!existingItem) return false;

      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.stock) {
        return false;
      }

      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
      };
      setItems(updatedItems);
    } else {
      const newItem: CartItem = {
        ...product,
        quantity,
        selectedOptions,
      };
      setItems((prev) => [...prev, newItem]);
    }

    return true;
  };

  const removeItem = (
    itemId: string,
    options?: CartItem["selectedOptions"],
  ) => {
    if (options) {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.id === itemId &&
              JSON.stringify(item.selectedOptions) === JSON.stringify(options)
            ),
        ),
      );
    } else {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    }
  };

  const updateQuantity = (
    itemId: string,
    quantity: number,
    options?: CartItem["selectedOptions"],
  ) => {
    if (quantity <= 0) return false;

    let targetItemIndex: number;

    if (options) {
      targetItemIndex = items.findIndex(
        (item) =>
          item.id === itemId &&
          JSON.stringify(item.selectedOptions) === JSON.stringify(options),
      );
    } else {
      targetItemIndex = items.findIndex((item) => item.id === itemId);
    }

    if (targetItemIndex === -1) return false;

    const targetItem = items[targetItemIndex];
    if (!targetItem) return false;

    const stock = targetItem.stock || 0;

    if (quantity > stock) {
      return false;
    }

    const updatedItems = [...items];
    updatedItems[targetItemIndex] = {
      ...targetItem,
      quantity,
    };

    setItems(updatedItems);
    return true;
  };

  const clearCart = () => {
    setItems([]);
    removePromoCode();
  };

  const applyPromoCode = async (code: string): Promise<boolean> => {
    try {
      // Convert cart items to the format expected by the validatePromoCode endpoint
      const cartItems = items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      // Use the client directly instead of hooks since we're not in a component context
      const result = await trpc.promoCode.validate.query({
        code,
        cartItems,
        subtotal,
      });

      if (result.success && result.result) {
        setPromoCode(result.result);
        return true;
      }

      setPromoCode(null);
      setDiscount(0);
      return false;
    } catch (error) {
      console.error("Failed to apply promo code:", error);
      setPromoCode(null);
      setDiscount(0);
      return false;
    }
  };

  const removePromoCode = () => {
    setPromoCode(null);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  // Total: subtotal minus promo discount, minus offer discount, plus shipping
  const total = Math.max(0, subtotal - discount - offerDiscount + shipping);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        discount,
        shipping,
        total,
        promoCode,
        applyPromoCode,
        removePromoCode,
        findItemInCart,
        appliedOffers,
        offerDiscount,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
