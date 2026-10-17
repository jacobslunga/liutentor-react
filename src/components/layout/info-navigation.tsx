import { Link } from "@tanstack/react-router";
import { ArrowUpRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { siteLinks } from "./site-links";
import "./info-navigation.css";

export function InfoNavigation() {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const reducedMotion = useReducedMotion();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setPresent(true);
    setOpen(nextOpen);
  }

  return (
    <Dialog open={present} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={open ? "Stäng meny" : "Öppna meny"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
            className="info-navigation-icon size-6"
            data-open={open}
          >
            <path className="info-navigation-line-top" d="M4 8h16" />
            <path className="info-navigation-line-bottom" d="M4 16h16" />
          </svg>
        </Button>
      </DialogTrigger>
      {present && (
        <DialogPortal forceMount>
          <DialogOverlay className="info-navigation-overlay top-[calc(3.5rem+env(safe-area-inset-top,0px))] bg-transparent backdrop-blur-none" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="info-navigation-dialog pointer-events-none fixed inset-0 z-50 outline-none"
          >
            <DialogTitle className="sr-only">Meny</DialogTitle>
            <div className="mx-auto flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] max-w-6xl items-center justify-end px-5 pt-[env(safe-area-inset-top,0px)] sm:px-8">
              {/* Keep the original SVG mounted so both directions animate smoothly.
                This modal close target sits directly over the header trigger. */}
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="pointer-events-auto size-11 hover:bg-transparent"
                  aria-label="Stäng meny"
                />
              </DialogClose>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: open ? 1 : 0 }}
              transition={{
                duration: reducedMotion ? 0 : open ? 0.16 : 0.12,
                ease: "easeOut",
              }}
              onAnimationComplete={() => {
                if (!open) setPresent(false);
              }}
              className="info-navigation pointer-events-auto absolute top-[calc(3.5rem+env(safe-area-inset-top,0px))] right-0 bottom-0 flex w-full flex-col bg-background pb-[env(safe-area-inset-bottom,0px)] shadow-overlay sm:max-w-lg"
            >
              <nav
                aria-label="Huvudmeny"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-10 sm:py-10"
              >
                <motion.div
                  initial={{
                    filter: reducedMotion ? "blur(0px)" : "blur(8px)",
                  }}
                  animate={{
                    filter: open || reducedMotion ? "blur(0px)" : "blur(8px)",
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : open ? 0.16 : 0.12,
                    ease: "easeOut",
                  }}
                  className="space-y-8"
                >
                  {siteLinks.map((section) => (
                    <div key={section.title}>
                      <p className="mb-3 text-xs font-medium tracking-widest text-muted-foreground uppercase">
                        {section.title}
                      </p>
                      <ul>
                        {section.links.map((link) => (
                          <li key={link.to}>
                            <DialogClose asChild>
                              <Link
                                to={link.to}
                                activeOptions={{ exact: true }}
                                activeProps={{
                                  className: "text-primary",
                                  "aria-current": "page",
                                }}
                                className="group flex min-h-12 items-center justify-between gap-4 rounded-sm py-2 font-heading text-[1.75rem] leading-tight font-medium tracking-tight transition-colors hover:text-primary sm:text-3xl keyboard-focus:outline-2 keyboard-focus:outline-offset-4 keyboard-focus:outline-ring"
                              >
                                {link.name}
                                <ArrowUpRightIcon className="size-5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                              </Link>
                            </DialogClose>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </motion.div>
              </nav>
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPortal>
      )}
    </Dialog>
  );
}
