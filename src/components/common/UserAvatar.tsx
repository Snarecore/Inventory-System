import React, { useState, useEffect } from "react";
import { cn } from "@/utils/cn";

export interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  shape?: "circle" | "rounded" | "rounded-xl" | "rounded-2xl";
  alt?: string;
  showFallbackImage?: boolean;
}

const sizeConfig: Record<
  NonNullable<UserAvatarProps["size"]>,
  { container: string; text: string }
> = {
  xs: { container: "w-6 h-6", text: "text-[10px]" },
  sm: { container: "w-7 h-7", text: "text-xs" },
  md: { container: "w-9 h-9", text: "text-sm" },
  lg: { container: "w-12 h-12", text: "text-base font-semibold" },
  xl: { container: "w-16 h-16", text: "text-xl font-bold" },
  "2xl": { container: "w-20 h-20 sm:w-22 sm:h-22", text: "text-2xl font-bold" },
};

const shapeConfig: Record<NonNullable<UserAvatarProps["shape"]>, string> = {
  circle: "rounded-full",
  rounded: "rounded-md",
  "rounded-xl": "rounded-xl",
  "rounded-2xl": "rounded-2xl",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = "User",
  photoUrl,
  size = "md",
  shape = "rounded",
  alt,
  showFallbackImage = false,
  className,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setHasError(false);
  }, [photoUrl]);

  const config = sizeConfig[size] || sizeConfig.md;
  const shapeClass = shapeConfig[shape] || "rounded-md";
  const initial = (name?.trim()?.charAt(0) || "U").toUpperCase();
  const showImage = Boolean(photoUrl && !hasError);

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0 select-none flex items-center justify-center font-bold",
        config.container,
        shapeClass,
        !showImage &&
          "bg-gradient-to-tr from-[#01306B] to-[#009fe3] text-white shadow-2xs",
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={photoUrl!}
          alt={alt || name}
          onError={() => setHasError(true)}
          className={cn("w-full h-full object-cover", shapeClass)}
          loading="lazy"
        />
      ) : (
        <span className={cn(config.text, "leading-none")}>{initial}</span>
      )}
    </div>
  );
};

export default UserAvatar;
