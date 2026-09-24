import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageIntro } from "@/components/info/page-intro";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentTitle } from "@/hooks/use-document-title";

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
                  <Button asChild size="sm" variant="outline">
                    <Link to="/">Tillbaka till startsidan</Link>
                  </Button>
                }
              />
            ) : status === "error" ? (
              <Result
                icon={<TriangleAlertIcon className="size-5 text-destructive" />}
                iconClassName="bg-destructive/10"
                title="Något gick fel"
                body="Försök igen eller kontakta oss direkt på liutentor@gmail.com"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus("idle")}
                  >
                    Försök igen
                  </Button>
                }
              />
            ) : (
              <form onSubmit={submit} noValidate>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="fb-name">
                      Namn{" "}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Valfritt
                      </span>
                    </FieldLabel>
                    <Input
                      id="fb-name"
                      placeholder="Ditt namn"
                      value={form.name}
                      onChange={update("name")}
                    />
                  </Field>
                  <Field data-invalid={!!errors.liuMail}>
                    <FieldLabel htmlFor="fb-mail">
                      LiU-mail{" "}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Obligatoriskt
                      </span>
                    </FieldLabel>
                    <Input
                      id="fb-mail"
                      type="email"
                      placeholder="liuid123@student.liu.se"
                      aria-invalid={!!errors.liuMail}
                      value={form.liuMail}
                      onChange={update("liuMail")}
                    />
                    {errors.liuMail ? (
                      <FieldError>{errors.liuMail}</FieldError>
                    ) : (
                      <FieldDescription>
                        Format: liuid123@student.liu.se
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="fb-part">
                      Del av hemsidan{" "}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Valfritt
                      </span>
                    </FieldLabel>
                    <Input
                      id="fb-part"
                      placeholder="t.ex. Söksidan, PDF-visaren..."
                      value={form.partOfWebsite}
                      onChange={update("partOfWebsite")}
                    />
                  </Field>
                  <Field data-invalid={!!errors.message}>
                    <FieldLabel htmlFor="fb-message">
                      Meddelande{" "}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">
                        Obligatoriskt
                      </span>
                    </FieldLabel>
                    <Textarea
                      id="fb-message"
                      rows={6}
                      placeholder="Berätta vad du tänker..."
                      aria-invalid={!!errors.message}
                      value={form.message}
                      onChange={update("message")}
                    />
                    {errors.message ? (
                      <FieldError>{errors.message}</FieldError>
                    ) : (
                      <FieldDescription>Minst 10 tecken</FieldDescription>
                    )}
                  </Field>
                  <div className="flex items-center justify-between gap-4 border-t pt-6">
                    <p className="text-xs text-muted-foreground">
                      Vi använder din mail bara för att kunna svara.
                    </p>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={status === "sending"}
                    >
                      {status === "sending" ? (
                        <LoaderCircleIcon className="animate-spin" />
                      ) : (
                        "Skicka"
                      )}
                    </Button>
                  </div>
                </FieldGroup>
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
