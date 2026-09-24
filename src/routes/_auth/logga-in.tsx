import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckIcon, LoaderCircleIcon, MailIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { LogoIcon } from "@/components/layout/logo-icon";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSeo } from "@/hooks/use-seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  validateLiuEmail,
  validateName,
  validatePassword,
} from "@/lib/auth-validation";
import { supabase } from "@/lib/supabase";

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
    description: tab === "logga-in" ? "Logga in till LiU Tentor." : "Skapa ett konto på LiU Tentor.",
    path: "/logga-in",
    robots: "noindex, nofollow",
  });

  const setTab = (value: string) =>
    void navigate({ search: { tab: value as AuthTab }, replace: true });

  return (
    <div className="flex w-full max-w-sm flex-col items-center space-y-8 lg:max-w-md">
      <Link to="/" className="mb-10 flex items-center space-x-2">
        <LogoIcon className="size-8" />
        <span className="font-logo text-xl tracking-tighter">LiU Tentor</span>
      </Link>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="logga-in" className="flex-1">
            Logga in
          </TabsTrigger>
          <TabsTrigger value="skapa-konto" className="flex-1">
            Skapa konto
          </TabsTrigger>
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

  async function submit(e: FormEvent) {
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
    // The auth layout leaves this page as soon as the session lands.
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
      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="login-email">LiU mail</FieldLabel>
          <Input
            id="login-email"
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            aria-invalid={!!errors.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="login-password">Lösenord</FieldLabel>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>
        {errors.general && (
          <FieldError className="text-center">{errors.general}</FieldError>
        )}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              "Logga in"
            )}
          </Button>
          <FieldDescription className="text-center">
            Inget konto?{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-primary"
              onClick={onSwitch}
            >
              Skapa ett här
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
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

  async function submit(e: FormEvent) {
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
    // With a session the auth layout redirects; otherwise email confirmation is pending.
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
          size="sm"
          variant="outline"
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
      <FieldGroup>
        <div className="flex gap-3">
          <Field data-invalid={!!errors.firstName} className="flex-1">
            <FieldLabel htmlFor="signup-first">Förnamn</FieldLabel>
            <Input
              id="signup-first"
              placeholder="Förnamn"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              value={form.firstName}
              onChange={update("firstName")}
            />
            <FieldError>{errors.firstName}</FieldError>
          </Field>
          <Field data-invalid={!!errors.lastName} className="flex-1">
            <FieldLabel htmlFor="signup-last">Efternamn</FieldLabel>
            <Input
              id="signup-last"
              placeholder="Efternamn"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              value={form.lastName}
              onChange={update("lastName")}
            />
            <FieldError>{errors.lastName}</FieldError>
          </Field>
        </div>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="signup-email">LiU mail</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            aria-invalid={!!errors.email}
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
          <FieldLabel htmlFor="signup-password">Lösenord</FieldLabel>
          <PasswordInput
            id="signup-password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
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
          <FieldLabel htmlFor="signup-confirm">Bekräfta lösenord</FieldLabel>
          <PasswordInput
            id="signup-confirm"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
          />
          <FieldError>{errors.confirmPassword}</FieldError>
        </Field>
        {errors.general && (
          <FieldError className="text-center">{errors.general}</FieldError>
        )}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              "Skapa konto"
            )}
          </Button>
          <FieldDescription className="text-center">
            Har du redan ett konto?{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-primary"
              onClick={onSwitch}
            >
              Logga in
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
