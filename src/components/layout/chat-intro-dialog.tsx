import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRightIcon, AtSignIcon, FolderIcon, QuoteIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
} from "@/lib/analytics";
import { hasSeenChatIntro, markChatIntroSeen } from "@/lib/chat-intro";
import { LogoIcon } from "./logo-icon";
import { AppDialog } from "@/components/shared/app-dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Lets the page settle before the dialog asks for attention. */
const OPEN_DELAY_MS = 900;

const HIGHLIGHTS = [
  { Icon: AtSignIcon, text: "Skriv @kurskod för att prata om en viss kurs" },
  { Icon: FolderIcon, text: "Samla föreläsningar i egna kurser" },
  { Icon: QuoteIcon, text: "Få svar med källor ur ditt material" },
];

/**
 * Introduces the learning chat to visitors who haven't seen it, once. Waits
 * for the analytics banner to be answered so the two never compete.
 */
export function ChatIntroDialog() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onChat = pathname === "/chatt" || pathname.startsWith("/chatt/");
  const [open, setOpen] = useState(false);
  const [consentAnswered, setConsentAnswered] = useState(
    () => getAnalyticsConsent() !== null,
  );

  useEffect(() => {
    if (consentAnswered) return;
    const onConsent = () => setConsentAnswered(true);
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
  }, [consentAnswered]);

  // Finding the chat on your own counts as having seen the intro.
  useEffect(() => {
    if (onChat) markChatIntroSeen();
  }, [onChat]);

  useEffect(() => {
    if (!consentAnswered || onChat || hasSeenChatIntro()) return;
    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [consentAnswered, onChat]);

  function close() {
    markChatIntroSeen();
    setOpen(false);
  }

  function tryIt() {
    close();
    void navigate({ to: "/chatt" });
  }

  if (!open) return null;

  return (
    <AppDialog
      onClose={close}
      header={
        <div>
          <div className="intro-mesh flex aspect-16/10 items-center justify-center rounded-xl">
            <div className="flex animate-in items-center gap-3 rounded-2xl bg-white/90 px-6 py-5 text-neutral-900 shadow-xl shadow-black/10 backdrop-blur-sm duration-700 fade-in-0 zoom-in-95 slide-in-from-bottom-2">
              <LogoIcon className="size-10 shrink-0" />
              <div>
                <p className="text-xl font-medium tracking-tight">Chatt</p>
                <p className="text-sm text-neutral-500">Plugga med AI</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 pt-5">
            <DialogTitle className="text-xl font-medium">
              Nyhet: plugga med AI
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              En chatt som hjälper dig förstå, inte bara lösa. Ställ frågor om
              vad som helst i dina kurser.
            </DialogDescription>
          </div>
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Inte nu
          </Button>
          <Button onClick={tryIt}>
            Kolla in det
            <ArrowRightIcon />
          </Button>
        </>
      }
    >
      <ul className="space-y-2">
        {HIGHLIGHTS.map(({ Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </AppDialog>
  );
}
