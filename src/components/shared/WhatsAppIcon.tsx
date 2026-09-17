import React from "react";

export interface WhatsAppIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: "white-bubble" | "green-bubble" | "monochrome";
}

/**
 * Ícone oficial de alta fidelidade do WhatsApp com geometria precisa do balão e monofone.
 * - white-bubble (ideal para botões verdes): balão de fala branco sólido com monofone verde (#25D366).
 * - green-bubble (ideal para fundos claros/brancos): balão de fala verde oficial com monofone branco (#FFFFFF).
 * - monochrome: utiliza currentColor.
 */
export function WhatsAppIcon({
  className = "h-6 w-6",
  variant = "white-bubble",
  ...props
}: WhatsAppIconProps) {
  if (variant === "green-bubble") {
    return (
      <svg
        viewBox="0 0 32 32"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path
          fill="#25D366"
          d="M16 2C8.28 2 2 8.28 2 16c0 2.72.78 5.26 2.13 7.41L2.05 30l6.81-2.03C10.9 29.17 13.37 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2z"
        />
        <path
          fill="#FFFFFF"
          d="M22.95 19.34c-.38-.19-2.27-1.12-2.62-1.25-.35-.13-.61-.19-.86.19-.26.38-.99 1.25-1.21 1.5-.23.26-.45.29-.83.1-.38-.19-1.62-.6-3.08-1.9-1.14-1.02-1.91-2.27-2.13-2.66-.23-.38-.02-.59.17-.78.17-.17.38-.45.58-.67.19-.22.26-.38.38-.64.13-.26.06-.48-.03-.67-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66h-.73c-.26 0-.67.1-1.02.48-.35.38-1.34 1.31-1.34 3.2s1.38 3.71 1.57 3.96c.19.26 2.7 4.13 6.55 5.79.91.4 1.63.63 2.18.81.92.29 1.76.25 2.42.15.74-.11 2.27-.93 2.59-1.82.32-.89.32-1.66.22-1.82-.1-.17-.35-.26-.73-.45z"
        />
      </svg>
    );
  }

  // Padrão: white-bubble (balão branco e monofone verde, com contraste impecável e nítido em botões verdes)
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="#FFFFFF"
        d="M16 2C8.28 2 2 8.28 2 16c0 2.72.78 5.26 2.13 7.41L2.05 30l6.81-2.03C10.9 29.17 13.37 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2z"
      />
      <path
        fill="#25D366"
        d="M22.95 19.34c-.38-.19-2.27-1.12-2.62-1.25-.35-.13-.61-.19-.86.19-.26.38-.99 1.25-1.21 1.5-.23.26-.45.29-.83.1-.38-.19-1.62-.6-3.08-1.9-1.14-1.02-1.91-2.27-2.13-2.66-.23-.38-.02-.59.17-.78.17-.17.38-.45.58-.67.19-.22.26-.38.38-.64.13-.26.06-.48-.03-.67-.1-.19-.86-2.08-1.18-2.85-.31-.75-.63-.65-.86-.66h-.73c-.26 0-.67.1-1.02.48-.35.38-1.34 1.31-1.34 3.2s1.38 3.71 1.57 3.96c.19.26 2.7 4.13 6.55 5.79.91.4 1.63.63 2.18.81.92.29 1.76.25 2.42.15.74-.11 2.27-.93 2.59-1.82.32-.89.32-1.66.22-1.82-.1-.17-.35-.26-.73-.45z"
      />
    </svg>
  );
}

export default WhatsAppIcon;
