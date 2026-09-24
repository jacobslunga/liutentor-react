import { createFileRoute } from "@tanstack/react-router";
import { MailIcon } from "lucide-react";
import { DocContact, LegalDocument } from "@/components/info/doc-layout";
import { PageIntro } from "@/components/info/page-intro";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { DocSection } from "@/types/doc";

export const Route = createFileRoute("/_info/privacy-policy")({
  component: PrivacyPolicyPage,
});

const sections: DocSection[] = [
  {
    title: "Personuppgiftsansvarig",
    content:
      "LiU Tentor är personuppgiftsansvarig för behandlingen av dina personuppgifter inom denna tjänst. Har du frågor om hur vi hanterar dina uppgifter är du välkommen att kontakta oss via liutentor@gmail.com.",
  },
  {
    title: "Information vi samlar in",
    content:
      "Vi samlar in information för att kunna tillhandahålla tjänsten och erbjuda personliga funktioner såsom sparade chattar:",
    items: [
      "E-postadress för inloggade användare (via Supabase Auth)",
      "Chattmeddelanden och konversationstitlar som sparas för att du ska kunna återse din historik",
      "Quizresultat och statistik kopplat till din användarprofil",
      "Anonymiserad användningsstatistik för att förstå hur tjänsten används",
      "Tentamaterial som du frivilligt väljer att ladda upp och dela",
    ],
  },
  {
    title: "Laglig grund för behandling",
    content:
      "Vi behandlar dina personuppgifter med stöd av följande rättsliga grunder enligt GDPR artikel 6:",
    items: [
      "Avtal (artikel 6.1 b) – För att kunna tillhandahålla ditt användarkonto och spara dina konversationer.",
      "Berättigat intresse (artikel 6.1 f) – För anonym analysstatistik i syfte att förbättra tjänsten.",
      "Samtycke (artikel 6.1 a) – När du frivilligt laddar upp material eller lämnar feedback.",
    ],
  },
  {
    title: "Tredjepartstjänster och dataöverföring",
    content:
      "Vi använder moderna molntjänster för att driva tjänsten och möjliggöra AI-funktionalitet:",
    items: [
      "Supabase: Vår databas och autentiseringstjänst. Din data lagras på servrar i Frankfurt, Tyskland (EU).",
      "AI-leverantör (OpenAI): Vid användning av chatten skickas meddelanden och relevant tentainnehåll till OpenAI för att generera svar. Ingen personlig profilinformation, som din e-postadress, skickas med chattförfrågan.",
      "Analystjänst (Google Analytics): Om du godkänner analys används tjänsten för att förstå hur webbplatsen används och förbättra användarupplevelsen.",
      "Infrastruktur: Vi säljer aldrig dina personuppgifter till tredje part.",
    ],
  },
  {
    title: "Lagringstid",
    content:
      "Vi lagrar dina personuppgifter endast så länge det är nödvändigt för de ändamål de samlades in för:",
    items: [
      "Kontoinformation och chatthistorik lagras så länge ditt konto är aktivt eller tills du själv raderar dem.",
      "Anonym analysdata lagras i upp till 12 månader.",
      "Uppladdade tentafiler lagras tills du eller vi begär att de tas bort.",
    ],
  },
  {
    title: "Cookies",
    content:
      "Vi använder nödvändig lokal lagring för inloggningssession och inställningar. Google Analytics aktiveras först när du godkänner analys i webbplatsens samtyckesruta. Ditt val sparas lokalt och du kan även rensa det via webbläsarens webbplatsdata.",
  },
  {
    title: "Dina rättigheter",
    content:
      "Enligt GDPR har du ett antal rättigheter avseende dina personuppgifter. Du har rätt att:",
    items: [
      "Begära tillgång till och utdrag av de personuppgifter vi behandlar om dig (dataportabilitet)",
      "Begära rättelse av felaktiga eller ofullständiga uppgifter",
      "Begära radering av dina uppgifter eller hela ditt konto",
      "Invända mot behandling som grundar sig på berättigat intresse",
      "Återkalla ditt samtycke när som helst",
    ],
  },
  {
    title: "Datasäkerhet",
    content:
      "Vi vidtar lämpliga tekniska säkerhetsåtgärder för att skydda dina data, inklusive krypterade anslutningar (HTTPS) och strikt åtkomstkontroll via Supabase RLS (Row Level Security) för att säkerställa att endast du kan komma åt dina privata chattar.",
  },
  {
    title: "Rätt att klaga",
    content:
      "Om du anser att vår behandling av dina personuppgifter strider mot GDPR har du rätt att lämna in ett klagomål till Integritetsskyddsmyndigheten (IMY).",
    items: ["Webbplats: www.imy.se", "E-post: imy@imy.se"],
  },
];

function PrivacyPolicyPage() {
  useDocumentTitle("Integritetspolicy");

  return (
    <div>
      <PageIntro
        eyebrow="Juridiskt"
        title="Integritetspolicy"
        lead="Hos LiU Tentor värnar vi om din integritet och behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR). Här beskriver vi vilka uppgifter vi samlar in, hur de hanteras säkert i Frankfurt (EU), och vilka rättigheter du har som användare."
        meta="Senast uppdaterad 24 september 2026"
      />
      <LegalDocument
        sections={sections}
        footer={
          <DocContact
            title="Kontakta oss"
            body="Har du frågor om din data eller vill utöva dina rättigheter, till exempel radera ditt konto? Hör av dig så hjälper vi dig."
          >
            <Button asChild size="sm" variant="outline">
              <a href="mailto:liutentor@gmail.com">
                <MailIcon data-icon="inline-start" />
                liutentor@gmail.com
              </a>
            </Button>
          </DocContact>
        }
      />
    </div>
  );
}
