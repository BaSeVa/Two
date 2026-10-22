import React from "react";

// Болид F1 сверху, носом вправо. Базовый размер 160×64.
export const Car: React.FC<{ color: string; width?: number }> = ({
  color,
  width = 160,
}) => (
  <svg width={width} height={(width * 64) / 160} viewBox="0 0 160 64">
    {/* колёса */}
    <rect x="22" y="2" width="26" height="14" rx="3" fill="#0d0d0d" />
    <rect x="22" y="48" width="26" height="14" rx="3" fill="#0d0d0d" />
    <rect x="104" y="5" width="22" height="12" rx="3" fill="#0d0d0d" />
    <rect x="104" y="47" width="22" height="12" rx="3" fill="#0d0d0d" />
    {/* подвеска */}
    <rect x="40" y="14" width="4" height="36" fill="#333" />
    <rect x="112" y="16" width="3" height="32" fill="#333" />
    {/* заднее антикрыло */}
    <rect x="2" y="10" width="14" height="44" rx="2" fill={color} />
    <rect x="2" y="10" width="5" height="44" fill="#111" />
    {/* кузов и понтоны */}
    <path
      d="M14 26 L44 22 L58 14 L92 16 L118 26 L150 29 L150 35 L118 38 L92 48 L58 50 L44 42 L14 38 Z"
      fill={color}
    />
    <path d="M58 14 L92 16 L100 22 L58 22 Z" fill="rgba(0,0,0,0.25)" />
    <path d="M58 50 L92 48 L100 42 L58 42 Z" fill="rgba(0,0,0,0.25)" />
    {/* кокпит и halo */}
    <ellipse cx="78" cy="32" rx="14" ry="7" fill="#111" />
    <path
      d="M66 32 Q78 20 92 32 Q78 44 66 32"
      fill="none"
      stroke="#555"
      strokeWidth="3"
    />
    <circle cx="80" cy="32" r="4" fill="#f5d000" />
    {/* переднее антикрыло */}
    <rect x="140" y="8" width="12" height="48" rx="3" fill={color} />
    <rect x="148" y="8" width="5" height="48" rx="2" fill="#111" />
  </svg>
);
