import { FormControl, Textarea, TextInput } from "@primer/react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageIntro } from "@/components/info/page-intro";
import { RouterLinkButton } from "@/components/shared/router-link";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/_info/feedback")({
  component: FeedbackPage,
});

const EMPTY = { name: "", liuMail: "", partOfWebsite: "", message: "" };

function FeedbackPage() {
  useDocumentTitle("Feedback");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({ liuMail: "", message: "" });
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  const update =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next = {
      liuMail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.liuMail)
        ? ""
        : "Ogiltig e-postadress",
      message:
        form.message.length < 10
          ? "Meddelande måste innehålla minst 10 tecken"
          : "",
    };
    setErrors(next);
    if (next.liuMail || next.message) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          message: form.message,
          part_of_website: form.partOfWebsite,
          liu_mail: form.liuMail,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setForm(EMPTY);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <PageIntro
        eyebrow="Support"
        title="Ge oss feedback."
        lead="Buggar, saknade tentor, en idé du haft mitt i pluggandet – allt hjälper. Vi läser varje meddelande."
      />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-x-12 gap-y-8 py-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-16">
          <p className="text-sm font-medium text-muted-foreground lg:sticky lg:top-24 lg:self-start">
            Formulär
          </p>
          <div className="max-w-xl">
            {status === "success" ? (
              <Result
                icon={
                  <CheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                }
                iconClassName="bg-emerald-500/10"
                title="Tack!"
                body="Vi har tagit emot din feedback och återkommer om det behövs."
                action={
                  <RouterLinkButton variant="outline" to="/" size="sm">
                    Tillbaka till startsidan
                  </RouterLinkButton>
                }
              />
            ) : status === "error" ? (
              <Result
                icon={<TriangleAlertIcon className="size-5 text-destructive" />}
                iconClassName="bg-destructive/10"
                title="Något gick fel"
                body="Försök igen eller kontakta oss direkt på liutentor@gmail.com"
                action={
                  <Button variant="outline" size="sm" onClick={() => setStatus("idle")}>
                    Försök igen
                  </Button>
                }
              />
            ) : (
              <form onSubmit={submit} noValidate>
                <div className="flex flex-col gap-6">
                  <FormControl>
                    <FormControl.Label>Namn</FormControl.Label>
                    <TextInput
                      block
                      placeholder="Ditt namn"
                      value={form.name}
                      onChange={update("name")}
                    />
                  </FormControl>
                  <FormControl required>
                    <FormControl.Label>LiU-mail</FormControl.Label>
                    <TextInput
                      block
                      type="email"
                      placeholder="liuid123@student.liu.se"
                      validationStatus={errors.liuMail ? "error" : undefined}
                      value={form.liuMail}
                      onChange={update("liuMail")}
                    />
                    {errors.liuMail ? (
                      <FormControl.Validation variant="error">
                        {errors.liuMail}
                      </FormControl.Validation>
                    ) : (
                      <FormControl.Caption>
                        Format: liuid123@student.liu.se
                      </FormControl.Caption>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormControl.Label>Del av hemsidan</FormControl.Label>
                    <TextInput
                      block
                      placeholder="t.ex. Söksidan, PDF-visaren..."
                      value={form.partOfWebsite}
                      onChange={update("partOfWebsite")}
                    />
                  </FormControl>
                  <FormControl required>
                    <FormControl.Label>Meddelande</FormControl.Label>
                    <Textarea
                      block
                      rows={6}
                      placeholder="Berätta vad du tänker..."
                      validationStatus={errors.message ? "error" : undefined}
                      value={form.message}
                      onChange={update("message")}
                    />
                    {errors.message ? (
                      <FormControl.Validation variant="error">
                        {errors.message}
                      </FormControl.Validation>
                    ) : (
                      <FormControl.Caption>Minst 10 tecken</FormControl.Caption>
                    )}
                  </FormControl>
                  <div className="flex items-center justify-between gap-4 border-t pt-6">
                    <p className="text-xs text-muted-foreground">
                      Vi använder din mail bara för att kunna svara.
                    </p>
                    <Button type="submit" size="sm" disabled={status === "sending"}>{status === "sending" && <Spinner />}
                      Skicka
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Result({
  icon,
  iconClassName,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      <div
        className={`flex size-10 items-center justify-center rounded-full ${iconClassName}`}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}
