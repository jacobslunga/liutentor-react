import type { LinkProps } from "@tanstack/react-router";

export const siteLinks: {
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
