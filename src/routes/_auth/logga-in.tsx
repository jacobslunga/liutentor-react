import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckIcon,
  LoaderCircleIcon,
  MailIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { LogoIcon } from "@/components/layout/logo-icon";
import { useSeo } from "@/hooks/use-seo";
import {
  validateLiuEmail,
  validateName,
  validatePassword,
} from "@/lib/auth-validation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthTab = "logga-in" | "skapa-konto";

export const Route = createFileRoute("/_auth/logga-in")({
  validateSearch: (search: Record<string, unknown>): { tab?: AuthTab } => ({
    tab: search.tab === "skapa-konto" ? "skapa-konto" : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { tab = "logga-in" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  useSeo({
    title: tab === "logga-in" ? "Logga in" : "Skapa konto",
    description:
      tab === "logga-in"
        ? "Logga in till LiU Tentor."
        : "Skapa ett konto på LiU Tentor.",
    path: "/logga-in",
    robots: "noindex, nofollow",
  });

  const setTab = (value: AuthTab) =>
    void navigate({ search: { tab: value }, replace: true });

  return (
    <div className="flex w-full max-w-sm flex-col items-center space-y-8 lg:max-w-md">
      <Link to="/" className="mb-10 flex items-center space-x-2">
        <LogoIcon className="size-8" />
        <span className="font-logo text-xl tracking-tighter">LiU Tentor</span>
      </Link>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as typeof tab)}
        className="w-full"
      >
        <TabsList aria-label="Konto" className="w-full">
          <TabsTrigger value="logga-in">Logga in</TabsTrigger>
          <TabsTrigger value="skapa-konto">Skapa konto</TabsTrigger>
        </TabsList>
        <TabsContent value="logga-in" className="pt-4">
          <LoginForm onSwitch={() => setTab("skapa-konto")} />
        </TabsContent>
        <TabsContent value="skapa-konto" className="pt-4">
          <SignupForm onSwitch={() => setTab("logga-in")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const next = {
      email: validateLiuEmail(email),
      password: validatePassword(password),
      general: "",
    };
    setErrors(next);
    if (next.email || next.password) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setErrors({
        ...next,
        general: "Fel e-post eller lösenord. Försök igen.",
      });
      return;
    }

    if (data.session) setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center space-y-3 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <CheckIcon className="size-6 text-primary" />
        </div>
        <p className="font-medium">Inloggad!</p>
        <p className="text-sm text-muted-foreground">
          Loggar in dig, tar dig till första sidan...
        </p>
        <LoaderCircleIcon className="mt-1 size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-5">
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="auth-liu-mail">LiU mail</FieldLabel>
          <Input
            id="auth-liu-mail"
            aria-invalid={!!errors.email}
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="auth-losenord">Lösenord</FieldLabel>
          <PasswordInput
            id="auth-losenord"
            aria-invalid={!!errors.password}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <FieldError>{errors.password}</FieldError>}
        </Field>
        {errors.general && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner />}
            Logga in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Inget konto?{" "}
            <Button
              variant="link"
              type="button"
              className="h-auto p-0"
              onClick={onSwitch}
            >
              Skapa ett här
            </Button>
          </p>
        </div>
      </div>
    </form>
  );
}

const EMPTY_SIGNUP = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
};

function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const [form, setForm] = useState(EMPTY_SIGNUP);
  const [errors, setErrors] = useState({ ...EMPTY_SIGNUP, general: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update =
    (key: keyof typeof EMPTY_SIGNUP) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const next = {
      email: validateLiuEmail(form.email),
      password: validatePassword(form.password),
      firstName: validateName(form.firstName, "Förnamn"),
      lastName: validateName(form.lastName, "Efternamn"),
      confirmPassword:
        form.confirmPassword !== form.password
          ? "Lösenorden matchar inte"
          : form.confirmPassword
            ? ""
            : "Bekräfta ditt lösenord",
      general: "",
    };
    setErrors(next);
    if (
      next.email ||
      next.password ||
      next.confirmPassword ||
      next.firstName ||
      next.lastName
    )
      return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setLoading(false);
      const taken =
        error.message.toLowerCase().includes("already registered") ||
        error.status === 422;
      setErrors({
        ...next,
        general: taken
          ? "Det finns redan ett konto med den här e-postadressen."
          : "Något gick fel. Försök igen.",
      });
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
        })
        .eq("id", data.user.id);
    }
    setLoading(false);

    if (!data.session) setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center space-y-3 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailIcon className="size-6 text-primary" />
        </div>
        <p className="font-medium">Konto skapat!</p>
        <p className="text-sm text-muted-foreground">
          Vi har skickat en bekräftelse till{" "}
          <span className="font-medium text-foreground">{form.email}</span>.
          Kontrollera din inkorg.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            setSuccess(false);
            onSwitch();
          }}
        >
          Gå till inloggning
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-5">
        <div className="flex gap-3">
          <Field data-invalid={!!errors.firstName} className="flex-1">
            <FieldLabel htmlFor="auth-fornamn">Förnamn</FieldLabel>
            <Input
              id="auth-fornamn"
              aria-invalid={!!errors.firstName}
              placeholder="Förnamn"
              autoComplete="given-name"
              value={form.firstName}
              onChange={update("firstName")}
            />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.lastName} className="flex-1">
            <FieldLabel htmlFor="auth-efternamn">Efternamn</FieldLabel>
            <Input
              id="auth-efternamn"
              aria-invalid={!!errors.lastName}
              placeholder="Efternamn"
              autoComplete="family-name"
              value={form.lastName}
              onChange={update("lastName")}
            />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </Field>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="auth-liu-mail-2">LiU mail</FieldLabel>
          <Input
            id="auth-liu-mail-2"
            aria-invalid={!!errors.email}
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
          />
          {errors.email ? (
            <FieldError>{errors.email}</FieldError>
          ) : (
            <FieldDescription>
              Måste vara din LiU mail (t.ex. abcde123@student.liu.se)
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="auth-losenord-2">Lösenord</FieldLabel>
          <PasswordInput
            id="auth-losenord-2"
            aria-invalid={!!errors.password}
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
          />
          {errors.password ? (
            <FieldError>{errors.password}</FieldError>
          ) : (
            <FieldDescription>Minst 8 tecken</FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!errors.confirmPassword}>
          <FieldLabel htmlFor="auth-bekrafta-losenord">
            Bekräfta lösenord
          </FieldLabel>
          <PasswordInput
            id="auth-bekrafta-losenord"
            aria-invalid={!!errors.confirmPassword}
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
          />
          {errors.confirmPassword && (
            <FieldError>{errors.confirmPassword}</FieldError>
          )}
        </Field>
        {errors.general && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errors.general}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner />}
            Skapa konto
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Har du redan ett konto?{" "}
            <Button
              variant="link"
              type="button"
              className="h-auto p-0"
              onClick={onSwitch}
            >
              Logga in
            </Button>
          </p>
        </div>
      </div>
    </form>
  );
}
