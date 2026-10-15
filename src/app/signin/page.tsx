"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { PasswordInput } from "@/components/password-input";

export default function SignInPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    router.replace(session.user.usernameIsCustom ? "/" : "/signup");
  }, [router, session, status]);

  const handleEmailSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Email or password is incorrect.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/signup" });
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-[0_20px_80px_rgb(15_23_42/0.08)] sm:p-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">mingle</span>
        </Link>

        <p className="text-sm font-semibold text-primary">Welcome back</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Use your email and password, or sign in with Google.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleEmailSignIn} className="mt-8 space-y-4">
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
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={isSigningIn || status === "loading"}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningIn && <LoaderCircle className="size-4 animate-spin" />}
            Sign in with email
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleAuthButton
          onClick={handleGoogleSignIn}
          loading={isGoogleLoading || status === "loading"}
          label="Continue with Google"
        />

        <p className="mt-7 text-center text-sm text-muted-foreground">
          New to mingle?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
