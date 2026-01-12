/*
 * Logo Component
 * Copyright (c) 2026 kogulmurugaiah
 * All rights reserved.
 * 
 * Developer: kogulmurugaiah
 * Description: Casham logo component with different sizes
 */

import cashamLogo from "../assets/casham logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Logo = ({ size = "md", className = "" }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto", 
    lg: "h-16 w-auto",
    xl: "h-24 w-auto"
  };

  return (
    <img
      src={cashamLogo}
      alt="Casham Logo"
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

export default Logo;
