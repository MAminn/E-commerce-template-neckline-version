import type { FC, ReactNode } from "react";
import type { PaymentBadge } from "#root/shared/types/layout-settings";

/**
 * Noir footer payment marks.
 *
 * Drawn inline as SVG rather than shipped as image assets: the footer is a
 * template surface, so the marks have to travel with the code and survive a
 * clone that has no `uploads/` directory. Each badge is a 38x24 white chip so
 * the row keeps a single rhythm regardless of which marks a merchant enables.
 *
 * Which badges appear is CMS-driven (`footer.paymentBadges`) — this module
 * only knows how to draw them.
 */

const CHIP = {
  width: 38,
  height: 24,
  radius: 4,
} as const;

function Chip({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width={CHIP.width}
      height={CHIP.height}
      viewBox={`0 0 ${CHIP.width} ${CHIP.height}`}
      role='img'
      aria-label={label}
      className='shrink-0'>
      <title>{label}</title>
      <rect
        width={CHIP.width}
        height={CHIP.height}
        rx={CHIP.radius}
        fill='#FFFFFF'
      />
      {children}
    </svg>
  );
}

const VisaBadge: FC = () => (
  <Chip label='Visa'>
    <text
      x='19'
      y='16.5'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='9'
      fontWeight='700'
      fontStyle='italic'
      letterSpacing='0.3'
      fill='#1A1F71'>
      VISA
    </text>
  </Chip>
);

const MastercardBadge: FC = () => (
  <Chip label='Mastercard'>
    <circle cx='15.5' cy='12' r='6' fill='#EB001B' />
    <circle cx='22.5' cy='12' r='6' fill='#F79E1B' />
    <path
      d='M19 7.3a6 6 0 0 0 0 9.4 6 6 0 0 0 0-9.4z'
      fill='#FF5F00'
    />
  </Chip>
);

const AmexBadge: FC = () => (
  <Chip label='American Express'>
    <rect width={CHIP.width} height={CHIP.height} rx={CHIP.radius} fill='#1F72CD' />
    <text
      x='19'
      y='15.5'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='7'
      fontWeight='700'
      letterSpacing='0.2'
      fill='#FFFFFF'>
      AMEX
    </text>
  </Chip>
);

const ApplePayBadge: FC = () => (
  <Chip label='Apple Pay'>
    {/* Apple glyph, then the "Pay" wordmark — same proportions as the mark. */}
    <path
      d='M12.05 8.6c.36-.44.6-1.04.53-1.65-.52.02-1.15.35-1.52.79-.33.38-.62 1-.54 1.59.58.05 1.17-.29 1.53-.73zm.52.83c-.84-.05-1.56.48-1.96.48-.4 0-1.02-.45-1.68-.44-.86.01-1.66.5-2.1 1.28-.9 1.56-.24 3.86.64 5.13.43.62.94 1.32 1.61 1.3.64-.03.89-.42 1.67-.42.78 0 1 .42 1.68.41.7-.01 1.14-.63 1.57-1.26.49-.72.7-1.42.71-1.46-.02-.01-1.36-.52-1.37-2.07-.01-1.29 1.05-1.91 1.1-1.94-.6-.89-1.54-.99-1.87-1.01z'
      fill='#111111'
    />
    <text
      x='27'
      y='16'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='9'
      fontWeight='600'
      fill='#111111'>
      Pay
    </text>
  </Chip>
);

const GooglePayBadge: FC = () => (
  <Chip label='Google Pay'>
    <text
      x='13'
      y='16'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='9'
      fontWeight='700'
      fill='#4285F4'>
      G
    </text>
    <text
      x='24'
      y='16'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='9'
      fontWeight='600'
      fill='#5F6368'>
      Pay
    </text>
  </Chip>
);

const PaypalBadge: FC = () => (
  <Chip label='PayPal'>
    <text
      x='19'
      y='16'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='7.5'
      fontWeight='700'
      fontStyle='italic'
      fill='#003087'>
      PayPal
    </text>
  </Chip>
);

const MadaBadge: FC = () => (
  <Chip label='mada'>
    <text
      x='19'
      y='16'
      textAnchor='middle'
      fontFamily='Arial, Helvetica, sans-serif'
      fontSize='8.5'
      fontWeight='700'
      fill='#1A1A1A'>
      mada
    </text>
  </Chip>
);

/** Badge id → renderer. Ids come straight from the CMS enum. */
export const NOIR_PAYMENT_BADGES: Record<PaymentBadge, FC> = {
  visa: VisaBadge,
  mastercard: MastercardBadge,
  amex: AmexBadge,
  applepay: ApplePayBadge,
  googlepay: GooglePayBadge,
  paypal: PaypalBadge,
  mada: MadaBadge,
};
