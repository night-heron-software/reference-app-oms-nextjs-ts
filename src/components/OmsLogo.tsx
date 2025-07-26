import React from 'react';

interface OMSLogoProps {
  /**
   * Determines the fill color of the logo based on whether an action is required.
   */
  actionRequired?: boolean;
}

/**
 * Note: This component uses the `font-kanit` class, which requires adding the 'Kanit'
 * font family to your `tailwind.config.js` file.
 *
 *  // tailwind.config.js
 *  theme: {
 *    extend: {
 *      fontFamily: {
 *        kanit: ['Kanit', 'sans-serif'],
 *      },
 *    },
 *  },
 */
const OmsLogo: React.FC<OMSLogoProps> = ({ actionRequired = false }) => {
  const statusColor = actionRequired ? '#EF8080' : '#366ee9';

  return (
    <svg width="60" height="40" viewBox="0 0 120 60" aria-hidden="true">
      <text
        fill={statusColor}
        x="55"
        y="50"
        // SVG presentation attributes are passed as props in React
        textAnchor="middle"
        strokeLinejoin="round"
        paintOrder="stroke fill"
        strokeWidth="12"
        // The inline styles from the Svelte component are converted to Tailwind classes
        className="font-kanit text-[3.5rem] font-semibold uppercase tracking-[-8px] stroke-black"
      >
        OMS
      </text>
    </svg>
  );
};

export default OmsLogo;
