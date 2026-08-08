export const COURSE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#34d399"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" fill="url(#g)"/>
      <rect x="180" y="130" width="240" height="130" rx="18" fill="#ffffff" opacity="0.16"/>
      <path d="M262 165v60l52-30z" fill="#ffffff" opacity="0.9"/>
      <circle cx="420" cy="150" r="60" fill="#ffffff" opacity="0.12"/>
      <text x="300" y="322" font-family="sans-serif" font-size="26" letter-spacing="2" fill="#ffffff" opacity="0.85" text-anchor="middle">COURSE</text>
    </svg>
  `);

export const formatMoney = (value) => {
  const n = Number(value || 0);
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
};
