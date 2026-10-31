import React, { useState } from "react";
import { methodMeta } from "@/services/mfs-service";

interface MfsLogoProps {
  method?: string;
  size?: number;
  radius?: number;
  className?: string;
}

export const MfsLogo: React.FC<MfsLogoProps> = ({
  method,
  size = 28,
  radius,
  className = "",
}) => {
  const [failed, setFailed] = useState(false);
  const brand = methodMeta(method);
  const boxRadius = radius ?? Math.round(size * 0.28);

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: boxRadius,
    flexShrink: 0,
    boxSizing: "border-box",
  };

  if (!brand.logo || failed) {
    return (
      <span
        className={`inline-grid place-items-center font-extrabold select-none shadow-xs text-white ${className}`}
        style={{
          ...style,
          backgroundColor: brand.tint,
          fontSize: Math.max(11, Math.round(size * 0.44)),
          lineHeight: 1,
        }}
        aria-hidden="true"
        title={brand.label}
      >
        {brand.label.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={brand.logo}
      alt={brand.label}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain bg-white border border-gray-200/80 p-0.5 shadow-xs ${className}`}
      style={style}
    />
  );
};

export default MfsLogo;
