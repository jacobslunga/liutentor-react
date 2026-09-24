import { createFileRoute, Link } from "@tanstack/react-router";
import { UploadIcon } from "lucide-react";
import { DocBlock, DocHeading, DocParagraph } from "@/components/info/doc-layout";
import { PageIntro } from "@/components/info/page-intro";
import { Button } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { cn } from "@/lib/utils";
import { useUploadModal } from "@/stores/upload-modal";

export const Route = createFileRoute("/_info/om-oss")({
  component: AboutPage,
});

const story = [
  {
    heading: "Varför vi finns",
    paragraphs: [
      "LiU Tentor startades av studenter som tröttnade på att klicka runt i röriga mappar för att hitta gamla tentor. Det som började som ett sidoprojekt en sen kväll under tentaveckan har vuxit till en samlingsplats för hela universitetet.",
      "Idén är enkel: allt material som redan är offentligt borde vara sökbart på ett ställe, utan inloggning, utan omvägar.",
    ],
  },
  {
    heading: "Vad du kan göra här",
    paragraphs: [
      "Sök upp din kurs och få alla tentor och facit samlade i en lista. Se betygsfördelning och godkändprocent för tidigare tillfällen. Öppna en tenta och be AI-assistenten om en ledtråd när du kör fast, eller generera ett quiz på materialet inför tentadagen.",
    ],
  },
  {
    heading: "Byggt av studenter, för studenter",
    paragraphs: [
      "Vi bygger LiU Tentor för att vi använder tjänsten själva varje dag. Varje förbättring kommer från något som irriterade oss under en pluggkväll – eller från feedback som någon annan skickat in.",
      "Har du en idé, hittat en bugg eller sitter du på tentor som saknas? Hör av dig, eller ladda upp direkt i appen.",
    ],
  },
];

const principles = [
  {
    title: "Gratis och utan konto",
    body: "Att söka och läsa tentor kräver ingen inloggning. Konto behövs bara för sparade chattar och quizhistorik.",
  },
  {
    title: "Din data stannar hos dig",
    body: "Vi säljer aldrig personuppgifter. Allt lagras inom EU och du kan radera ditt konto när du vill.",
  },
  {
    title: "Ärliga om AI:n",
    body: "AI-assistenten är ett stöd, inte ett facit. Vi är tydliga med var den brister istället för att överdriva vad den klarar.",
  },
];

function AboutPage() {
  useDocumentTitle("Om oss");
  const openUploadModal = useUploadModal((s) => s.open);

  return (
    <div>
      <PageIntro
        eyebrow="Om oss"
        title="Tentaplugget borde inte börja med en filjakt."
        lead="LiU Tentor är ett studentdrivet, fristående projekt. Vår mission är att göra tentaplugg så smidigt och tillgängligt som möjligt för alla vid Linköpings universitet."
      />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {story.map((block, i) => (
          <DocBlock key={block.heading} heading={<DocHeading>{block.heading}</DocHeading>} className={cn(i > 0 && "border-t")}>
            <div className="space-y-4">
              {block.paragraphs.map((paragraph, j) => (
                <DocParagraph key={j}>{paragraph}</DocParagraph>
              ))}
            </div>
          </DocBlock>
        ))}

        <section className="border-t py-14 lg:py-20">
          <p className="text-sm font-medium text-muted-foreground">Tre saker vi står för</p>
          <div className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {principles.map((principle, i) => (
              <div key={principle.title}>
                <span className="text-3xl leading-none font-medium text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-base font-medium">{principle.title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{principle.body}</p>
              </div>
            ))}
          </div>
        </section>

        <DocBlock heading={<DocHeading>Hjälp till</DocHeading>} className="border-t py-14 lg:py-20">
          <DocParagraph>
            Arkivet växer när studenter delar med sig. Ligger det tentor på din dator som saknas här, tar
            uppladdningen under en minut.
          </DocParagraph>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => openUploadModal()}>
              <UploadIcon data-icon="inline-start" />
              Ladda upp tenta
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/feedback">Skicka feedback</Link>
            </Button>
          </div>
        </DocBlock>
      </div>
    </div>
  );
}
