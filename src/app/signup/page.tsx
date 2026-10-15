"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { PasswordInput } from "@/components/password-input";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

export default function SignUpPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [profileStatus, setProfileStatus] = useState<
    "loading" | "needs-username" | "complete" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIdRef = useRef(0);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    const controller = new AbortController();
    async function loadProfile() {
      setProfileStatus("loading");
      setError("");
      try {
        const response = await fetch("/api/users/me", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Could not load your account.");
        }

        if (result.requiresUsername) {
          setProfileStatus("needs-username");
        } else {
          setProfileStatus("complete");
          router.replace("/");
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load your account.",
        );
        setProfileStatus("error");
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [profileRetry, router, sessionStatus]);

  const checkUsername = useCallback((input: string) => {
    const value = input.trim().toLowerCase();
    setUsername(value);
    setError("");
    const checkId = ++checkIdRef.current;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value) {
      setUsernameStatus("idle");
      return;
    }
    if (!usernamePattern.test(value)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/users/username?username=${encodeURIComponent(value)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (checkId !== checkIdRef.current) return;
        if (!response.ok) {
          setUsernameStatus("invalid");
          setError(result.error || "Could not check username availability.");
          return;
        }
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        if (checkId === checkIdRef.current) {
          setUsernameStatus("idle");
          setError("Could not check username availability. Please try again.");
        }
      }
    }, 350);
  }, []);

  const finishGoogleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (usernameStatus !== "available") {
      setError("Choose a username that is available.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setUsernameStatus("taken");
        throw new Error(result.error || "Could not save your username.");
      }
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save your username.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerManually = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (usernameStatus !== "available") {
      setError("Choose a username that is available.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && result.error?.includes("username")) {
          setUsernameStatus("taken");
        }
        throw new Error(result.error || "Could not create your account.");
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        router.replace("/signin?registered=1");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueWithGoogle = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/signup" });
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const authenticated = sessionStatus === "authenticated";
  const checkingProfile =
    authenticated &&
    (profileStatus === "loading" || profileStatus === "complete");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-[0_20px_80px_rgb(15_23_42/0.08)] sm:p-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">mingle</span>
        </Link>

        <p className="text-sm font-semibold text-primary">
          {authenticated ? "One last step" : "Join the conversation"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {authenticated ? "Choose your username" : "Create your account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {authenticated
            ? `Signed in as ${session?.user?.email ?? "your Google account"}. Choose a unique username to finish.`
            : "Sign up with your email and password, or continue with Google."}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {sessionStatus === "loading" || checkingProfile ? (
          <div
            className="mt-8 flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle className="size-4 animate-spin" />
            Checking your account…
          </div>
        ) : authenticated && profileStatus === "error" ? (
          <button
            type="button"
            onClick={() => setProfileRetry((retry) => retry + 1)}
            className="mt-7 h-12 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
        ) : authenticated && profileStatus === "needs-username" ? (
          <form onSubmit={finishGoogleSignup} className="mt-8 space-y-5">
            <UsernameField
              value={username}
              status={usernameStatus}
              onChange={checkUsername}
            />
            <button
              type="submit"
              disabled={isSubmitting || usernameStatus !== "available"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              Finish sign up
            </button>
          </form>
        ) : !authenticated ? (
          <>
            <form onSubmit={registerManually} className="mt-8 space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                <span>Name</span>
                <input
                  autoComplete="name"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <UsernameField
                value={username}
                status={usernameStatus}
                onChange={checkUsername}
              />

              <label className="block space-y-2 text-sm font-medium">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium">
                <span>Password</span>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  minLength={8}
                />
                <span className="block text-xs text-muted-foreground">
                  Use at least 8 characters.
                </span>
              </label>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  usernameStatus !== "available" ||
                  password.length < 8
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
                Create account
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                OR
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <GoogleAuthButton
              onClick={continueWithGoogle}
              loading={isGoogleLoading}
              label="Continue with Google"
            />
          </>
        ) : null}

        <p className="mt-7 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

function UsernameField({
  value,
  status,
  onChange,
}: {
  value: string;
  status: UsernameStatus;
  onChange: (value: string) => void;
}) {
  const message = {
    idle: "Use 3–30 lowercase letters, numbers, or underscores.",
    checking: "Checking username…",
    available: "Username is available.",
    taken: "That username is already taken.",
    invalid: "Use 3–30 lowercase letters, numbers, or underscores.",
  }[status];

  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>Username</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          @
        </span>
        <input
          autoComplete="username"
          maxLength={30}
          minLength={3}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="yourname"
          aria-describedby="username-status"
          aria-invalid={status === "taken" || status === "invalid"}
          className="h-12 w-full rounded-xl border border-border bg-background pl-9 pr-11 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <LoaderCircle
              className="size-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {status === "available" && (
            <Check
              className="size-4 text-emerald-600"
              aria-label="Available"
            />
          )}
          {(status === "taken" || status === "invalid") && (
            <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
          )}
        </span>
      </span>
      <span
        id="username-status"
        aria-live="polite"
        className={`block text-xs ${
          status === "available"
            ? "text-emerald-600"
            : status === "taken" || status === "invalid"
              ? "text-destructive"
              : "text-muted-foreground"
        }`}
      >
        {message}
      </span>
    </label>
  );
}
