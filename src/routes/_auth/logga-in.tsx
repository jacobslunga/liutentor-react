import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckIcon, LoaderCircleIcon, MailIcon } from "lucide-react";
import { Banner, FormControl, Link as PrimerLink, SegmentedControl, TextInput } from "@primer/react";
import { useState, type FormEvent } from "react";
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

  const setTab = (value: AuthTab) =>
    void navigate({ search: { tab: value }, replace: true });

  return (
    <div className="flex w-full max-w-sm flex-col items-center space-y-8 lg:max-w-md">
      <Link to="/" className="mb-10 flex items-center space-x-2">
        <LogoIcon className="size-8" />
        <span className="font-logo text-xl tracking-tighter">LiU Tentor</span>
      </Link>

      <div className="w-full">
        <SegmentedControl
          aria-label="Konto"
          fullWidth
          onChange={(i) => setTab(i === 0 ? "logga-in" : "skapa-konto")}
        >
          <SegmentedControl.Button selected={tab === "logga-in"}>
            Logga in
          </SegmentedControl.Button>
          <SegmentedControl.Button selected={tab === "skapa-konto"}>
            Skapa konto
          </SegmentedControl.Button>
        </SegmentedControl>
        <div className="pt-4">
          {tab === "logga-in" ? (
            <LoginForm onSwitch={() => setTab("skapa-konto")} />
          ) : (
            <SignupForm onSwitch={() => setTab("logga-in")} />
          )}
        </div>
      </div>
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
      <div className="flex flex-col gap-5">
        <FormControl>
          <FormControl.Label>LiU mail</FormControl.Label>
          <TextInput
            block
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            validationStatus={errors.email ? "error" : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && (
            <FormControl.Validation variant="error">
              {errors.email}
            </FormControl.Validation>
          )}
        </FormControl>
        <FormControl>
          <FormControl.Label>Lösenord</FormControl.Label>
          <PasswordInput
            autoComplete="current-password"
            validationStatus={errors.password ? "error" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && (
            <FormControl.Validation variant="error">
              {errors.password}
            </FormControl.Validation>
          )}
        </FormControl>
        {errors.general && (
          <Banner
            variant="critical"
            layout="compact"
            title="Fel"
            hideTitle
            description={errors.general}
          />
        )}
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>{loading && <Spinner />}
            Logga in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Inget konto?{" "}
            <PrimerLink as="button" type="button" inline onClick={onSwitch}>
              Skapa ett här
            </PrimerLink>
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
        <Button variant="outline" size="sm" className="mt-2" onClick={() => {
            setSuccess(false);
            onSwitch();
          }}>
          Gå till inloggning
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-5">
        <div className="flex gap-3">
          <FormControl className="flex-1">
            <FormControl.Label>Förnamn</FormControl.Label>
            <TextInput
              block
              placeholder="Förnamn"
              autoComplete="given-name"
              validationStatus={errors.firstName ? "error" : undefined}
              value={form.firstName}
              onChange={update("firstName")}
            />
            {errors.firstName && (
              <FormControl.Validation variant="error">
                {errors.firstName}
              </FormControl.Validation>
            )}
          </FormControl>
          <FormControl className="flex-1">
            <FormControl.Label>Efternamn</FormControl.Label>
            <TextInput
              block
              placeholder="Efternamn"
              autoComplete="family-name"
              validationStatus={errors.lastName ? "error" : undefined}
              value={form.lastName}
              onChange={update("lastName")}
            />
            {errors.lastName && (
              <FormControl.Validation variant="error">
                {errors.lastName}
              </FormControl.Validation>
            )}
          </FormControl>
        </div>
        <FormControl>
          <FormControl.Label>LiU mail</FormControl.Label>
          <TextInput
            block
            type="email"
            placeholder="abcde123@student.liu.se"
            autoComplete="email"
            validationStatus={errors.email ? "error" : undefined}
            value={form.email}
            onChange={update("email")}
          />
          {errors.email ? (
            <FormControl.Validation variant="error">
              {errors.email}
            </FormControl.Validation>
          ) : (
            <FormControl.Caption>
              Måste vara din LiU mail (t.ex. abcde123@student.liu.se)
            </FormControl.Caption>
          )}
        </FormControl>
        <FormControl>
          <FormControl.Label>Lösenord</FormControl.Label>
          <PasswordInput
            autoComplete="new-password"
            validationStatus={errors.password ? "error" : undefined}
            value={form.password}
            onChange={update("password")}
          />
          {errors.password ? (
            <FormControl.Validation variant="error">
              {errors.password}
            </FormControl.Validation>
          ) : (
            <FormControl.Caption>Minst 8 tecken</FormControl.Caption>
          )}
        </FormControl>
        <FormControl>
          <FormControl.Label>Bekräfta lösenord</FormControl.Label>
          <PasswordInput
            autoComplete="new-password"
            validationStatus={errors.confirmPassword ? "error" : undefined}
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
          />
          {errors.confirmPassword && (
            <FormControl.Validation variant="error">
              {errors.confirmPassword}
            </FormControl.Validation>
          )}
        </FormControl>
        {errors.general && (
          <Banner
            variant="critical"
            layout="compact"
            title="Fel"
            hideTitle
            description={errors.general}
          />
        )}
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>{loading && <Spinner />}
            Skapa konto
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Har du redan ett konto?{" "}
            <PrimerLink as="button" type="button" inline onClick={onSwitch}>
              Logga in
            </PrimerLink>
          </p>
        </div>
      </div>
    </form>
  );
}
