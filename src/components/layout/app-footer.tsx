import { Link, type LinkProps } from "@tanstack/react-router";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { LogoIcon } from "./logo-icon";

const groupedLinks: {
  title: string;
  links: { name: string; to: LinkProps["to"] }[];
}[] = [
  {
    title: "Tjänsten",
    links: [
      { name: "Sök tentor", to: "/" },
      { name: "Ladda upp tenta", to: "/upload-exams" },
      { name: "Om oss", to: "/om-oss" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Vanliga frågor", to: "/faq" },
      { name: "Feedback", to: "/feedback" },
    ],
  },
  {
    title: "Juridiskt",
    links: [
      { name: "Integritetspolicy", to: "/privacy-policy" },
      { name: "Upphovsrätt", to: "/copyright-policy" },
      { name: "AI-policy", to: "/ai-policy" },
    ],
  },
];

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-24 w-full border-t bg-background">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <Link
              to="/"
              className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-70"
            >
              <LogoIcon className="size-7" />
              <span className="font-logo text-xl font-medium tracking-tighter">
                LiU Tentor
              </span>
            </Link>
            <p className="max-w-56 text-sm leading-relaxed text-muted-foreground">
              Studentdrivet tentaarkiv för Linköpings universitet.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            {groupedLinks.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-medium text-foreground">{section.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.to}
                        className="text-sm text-foreground/70 transition-colors duration-150 hover:text-foreground"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {year} LiU Tentor. Inte affilierad med Linköpings universitet.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="mailto:liutentor@gmail.com"
              className="text-xs text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              liutentor@gmail.com
            </a>
            <SettingsDialog />
          </div>
        </div>
      </div>
    </footer>
  );
}
