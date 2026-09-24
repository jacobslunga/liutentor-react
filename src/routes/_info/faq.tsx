import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { DocBlock, DocHeading, DocParagraph } from "@/components/info/doc-layout";
import { PageIntro } from "@/components/info/page-intro";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";

export const Route = createFileRoute("/_info/faq")({
  component: FaqPage,
});

const groups = [
  {
    label: "Om tjänsten",
    faqs: [
      {
        q: "Är det här en officiell LiU-sida?",
        a: "Nej, LiU Tentor är ett studentdrivet, fristående projekt som är skapat av studenter för studenter vid Linköpings universitet.",
      },
      {
        q: "Kostar det något eller krävs konto?",
        a: "Att söka och läsa tentor är gratis och kräver inget konto. Du loggar bara in om du vill spara chattar och quizhistorik.",
      },
    ],
  },
  {
    label: "Material",
    faqs: [
      {
        q: "Var kommer tentorna ifrån?",
        a: "Alla tentor är offentliga handlingar som antingen har hämtats från universitetets öppna kurshemsidor eller laddats upp av hjälpsamma studenter.",
      },
      {
        q: "Hur laddar jag upp nya tentor eller facit?",
        a: "Klicka på 'Ladda upp tenta' i menyn för att dra och släppa dina PDF-filer. Materialet granskas och blir därefter tillgängligt för alla.",
      },
      {
        q: "Varför saknas tentor för min kurs?",
        a: "Om din kurs saknar tentor beror det oftast på att materialet inte publicerats öppet än. Ladda gärna upp tentor om du har dem på din dator!",
      },
    ],
  },
  {
    label: "Statistik & AI",
    faqs: [
      {
        q: "Hur fungerar tentastatistiken och betygsfördelningen?",
        a: "Betygsstatistik och godkändprocent hämtas från offentlig tentastatistik vid LiU och sammanställs automatiskt på respektive kurssida.",
      },
      {
        q: "Hur fungerar AI-assistenten för tentor?",
        a: "AI-assistenten analyserar den valda tentan och facit i realtid för att ge förklaringar, stegvisa ledtrådar eller besvara dina frågor direkt i webbläsaren.",
      },
      {
        q: "Kan jag lita på AI:ns svar?",
        a: "Se dem som pedagogiska förslag, inte som facit. AI-modeller kan ha fel, så dubbelkolla alltid kritiska beräkningar mot kurslitteraturen. Läs mer i vår AI-policy.",
      },
    ],
  },
];

function FaqPage() {
  useDocumentTitle("Vanliga frågor (FAQ)");
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div>
      <PageIntro
        eyebrow="Support"
        title="Vanliga frågor"
        lead="Svar på det vi får frågor om oftast – om var tentorna kommer ifrån, hur statistiken räknas och vad AI-assistenten faktiskt gör."
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {groups.map((group, i) => (
          <section
            key={group.label}
            className={cn("grid gap-x-12 gap-y-2 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-10", i > 0 && "border-t")}
          >
            <p className="pt-6 text-sm font-medium text-muted-foreground lg:sticky lg:top-24 lg:self-start">
              {group.label}
            </p>
            <dl className="max-w-2xl">
              {group.faqs.map((faq) => (
                <div key={faq.q} className="border-b py-6 last:border-b-0">
                  <dt className="text-base font-medium">{faq.q}</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-[1.75] text-foreground/70">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <DocBlock heading={<DocHeading>Hittade du inte svaret?</DocHeading>} className="border-t py-14 lg:py-20">
          <DocParagraph>
            Skicka en rad till oss så svarar vi – eller fyll luckan direkt genom att ladda upp tentor som saknas.
          </DocParagraph>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/feedback">Skicka feedback</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => openUploadModal()}>
              <UploadIcon data-icon="inline-start" />
              Ladda upp tenta
            </Button>
          </div>
        </DocBlock>
      </div>
    </div>
  );
}
