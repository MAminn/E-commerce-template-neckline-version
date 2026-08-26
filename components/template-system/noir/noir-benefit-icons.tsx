import type React from "react";
import { ValuePropIconType } from "#root/shared/types/homepage-content";
import { VALUE_PROP_ICON_MAP } from "#root/components/template-system/shared/value-prop-icons";

/**
 * Noir benefit glyphs — the two icons the reference draws that lucide has no
 * close equivalent for.
 *
 * Everything else in the strip resolves through the shared
 * `VALUE_PROP_ICON_MAP`, so a merchant's icon choice keeps its meaning in
 * every template. Only where lucide's glyph reads visibly wrong against the
 * reference does Noir substitute its own:
 *
 *   CLEAN   lucide's `Leaf` sweeps a long stem into the bottom-left corner;
 *           the reference is a bare tilted blade with a midrib and no stem.
 *   POCKET  lucide has no palm-holding-a-drop. `HandCoins` is the closest,
 *           and its two coins read as currency rather than product.
 *
 * CLOCK and PACKAGE are left alone: lucide's `Clock` (ring + two hands) and
 * `Package` (parcel with a top seam) already match the reference glyphs.
 *
 * Both custom glyphs are authored on lucide's own contract — a 24x24 viewBox,
 * `fill: none`, `stroke: currentColor`, round caps and joins, and NO
 * stroke-width attribute — so the strip's `[stroke-width:1.25]` governs them
 * exactly as it governs the lucide icons beside them. Mixing the two sets is
 * therefore invisible: same grid, same weight, same terminals.
 */

type NoirBenefitIconProps = { className?: string };

/** Shared attributes that put a custom glyph on lucide's drawing contract. */
const LUCIDE_CONTRACT = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * Leaf — a symmetric blade between two tips (lower-left, upper-right) with a
 * midrib along its long axis. Two mirrored cubics meeting at the tips, which
 * is what gives the reference's even taper.
 */
function NoirLeafIcon({ className }: NoirBenefitIconProps) {
  return (
    <svg {...LUCIDE_CONTRACT} className={className} aria-hidden='true'>
      <path d='M5.2 18.8C5.2 11.3 11.3 5.2 18.8 5.2c0 7.5-6.1 13.6-13.6 13.6Z' />
      <path d='M6.4 17.6 17.6 6.4' />
    </svg>
  );
}

/**
 * Open palm cradling a drop.
 *
 * The hand is lucide's own `HandCoins` hand — same three paths, so it sits in
 * the icon set natively — with the coin circles replaced by a teardrop above
 * the palm. The drop's bottom lands at y=10.5 and the palm's highest finger
 * at y≈11, keeping the half-pixel of air the reference shows between them.
 */
function NoirPocketIcon({ className }: NoirBenefitIconProps) {
  return (
    <svg {...LUCIDE_CONTRACT} className={className} aria-hidden='true'>
      <path d='M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17' />
      <path d='m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9' />
      <path d='m2 16 6 6' />
      <path d='M14.5 2.6c1.9 2.2 2.9 3.7 2.9 5a2.9 2.9 0 1 1-5.8 0c0-1.3 1-2.8 2.9-5Z' />
    </svg>
  );
}

/** Noir's overrides, applied on top of the shared map. */
const NOIR_ICON_OVERRIDES: Partial<
  Record<ValuePropIconType, React.ComponentType<NoirBenefitIconProps>>
> = {
  [ValuePropIconType.CLEAN]: NoirLeafIcon,
  [ValuePropIconType.POCKET]: NoirPocketIcon,
};

/**
 * Resolve a CMS icon choice to the glyph Noir draws for it: the Noir override
 * where one exists, otherwise the shared lucide glyph, otherwise the shared
 * map's shopping-bag default.
 */
export function getNoirBenefitIcon(
  icon: ValuePropIconType,
): React.ComponentType<NoirBenefitIconProps> {
  return (
    NOIR_ICON_OVERRIDES[icon] ??
    VALUE_PROP_ICON_MAP[icon] ??
    VALUE_PROP_ICON_MAP[ValuePropIconType.SHOPPING]
  );
}
