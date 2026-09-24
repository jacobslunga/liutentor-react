import { useSeo } from "./use-seo";

const descriptions: Record<string, string> = {
  "Vanliga frågor (FAQ)": "Svar på vanliga frågor om tentor, facit, uppladdningar, konton och AI-funktioner på LiU Tentor.",
  Feedback: "Skicka feedback till LiU Tentor-teamet.",
  "Om oss": "Läs om LiU Tentor och hur vi hjälper studenter att hitta och plugga på gamla tentor.",
  Upphovsrätt: "Information om upphovsrätt och hantering av tentamaterial på LiU Tentor.",
  Integritetspolicy: "Så behandlar och skyddar LiU Tentor dina personuppgifter.",
  "Ladda upp tenta": "Ladda upp gamla tentor och facit till LiU Tentor.",
  "AI-policy": "Så använder LiU Tentor AI på ett ansvarsfullt och transparent sätt.",
};

export function useDocumentTitle(title: string) {
  useSeo({ title, description: descriptions[title] });
}
