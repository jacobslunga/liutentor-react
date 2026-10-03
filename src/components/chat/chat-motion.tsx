import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

export function ChatMotion({ children }: { children: ReactNode }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig
        reducedMotion="user"
        skipAnimations={reducedMotion}
        transition={{ type: "spring", stiffness: 400, damping: 38, mass: 0.8 }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
