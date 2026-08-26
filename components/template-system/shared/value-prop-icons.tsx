import type React from "react";
import {
  ShoppingBag,
  Truck,
  Shield,
  Headphones,
  Award,
  RefreshCw,
  Package,
  FlaskConical,
  Receipt,
  CreditCard,
  Leaf,
  HandCoins,
  Clock,
  Briefcase,
  Heart,
  BadgeCheck,
  Waves,
  Ban,
  Globe,
} from "lucide-react";
import { ValuePropIconType } from "#root/shared/types/homepage-content";

export const VALUE_PROP_ICON_MAP: Record<
  ValuePropIconType,
  React.ComponentType<{ className?: string }>
> = {
  [ValuePropIconType.SHOPPING]: ShoppingBag,
  [ValuePropIconType.SHIPPING]: Truck,
  [ValuePropIconType.SECURITY]: Shield,
  [ValuePropIconType.SUPPORT]: Headphones,
  [ValuePropIconType.QUALITY]: Award,
  [ValuePropIconType.RETURNS]: RefreshCw,
  [ValuePropIconType.PACKAGE]: Package,
  [ValuePropIconType.BOTTLE]: FlaskConical,
  [ValuePropIconType.RECEIPT]: Receipt,
  [ValuePropIconType.PAYMENT]: CreditCard,
  // Added for the Noir benefits strip. Purely additive — no existing mapping
  // changed, so Modern/Classic/Editorial/Minimal render exactly as before and
  // simply gain three more options. Noir overrides two of these with its own
  // reference-matched glyphs (see noir-benefit-icons.tsx); these lucide
  // choices are what every other template gets.
  [ValuePropIconType.CLEAN]: Leaf,
  [ValuePropIconType.POCKET]: HandCoins,
  [ValuePropIconType.CLOCK]: Clock,
  // Added for the Noir brand-statement section. Additive, like the block
  // above — no existing mapping changed.
  [ValuePropIconType.BRIEFCASE]: Briefcase,
  [ValuePropIconType.HEART]: Heart,
  [ValuePropIconType.BADGE]: BadgeCheck,
  [ValuePropIconType.HEAT]: Waves,
  [ValuePropIconType.BAN]: Ban,
  [ValuePropIconType.GLOBE]: Globe,
};

export function ValuePropIcon({
  icon,
  className,
}: {
  icon: ValuePropIconType;
  className?: string;
}) {
  const IconComponent = VALUE_PROP_ICON_MAP[icon] ?? Award;
  return <IconComponent className={className} />;
}
