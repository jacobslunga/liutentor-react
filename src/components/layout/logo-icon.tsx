import { cn } from "@/lib/utils";

interface LogoIconProps {
  className?: string;
  isBlackAndWhite?: boolean;
}

export function LogoIcon({ className, isBlackAndWhite = false }: LogoIconProps) {
  const lightSrc = isBlackAndWhite ? "/images/logo-black.svg" : "/images/logo-light.svg";
  const darkSrc = isBlackAndWhite ? "/images/logo-white.svg" : "/images/logo-dark.svg";

  return (
    <>
      <img src={lightSrc} alt="Logo" className={cn("dark:hidden", className)} />
      <img src={darkSrc} alt="Logo" className={cn("hidden dark:block", className)} />
    </>
  );
}
