"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export default function CreatePostPage() {
  const router = useRouter();
  const { status } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );

  function selectImage(file: File | undefined) {
    setError("");
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }
    if (!allowedImageTypes.has(file.type)) {
      setImageFile(null);
      setImagePreview("");
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageFile(null);
      setImagePreview("");
      setError("Post images must be 3 MB or smaller.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !description.trim()) {
      setError("A title and description are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("description", description.trim());
      if (imageFile) formData.set("image", imageFile);

      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not create your post.");
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create your post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
        <p className="py-12 text-center text-sm text-muted-foreground">
          Checking your account…
        </p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
        <section className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Sign in to create a post</h1>
          <Link
            href="/signin"
            className="mt-4 inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Home
      </Link>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h1 className="mb-6 text-2xl font-bold">Create a post</h1>
        <form className="space-y-5" onSubmit={createPost}>
          <label className="block text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              required
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={10_000}
              required
              rows={7}
              className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium">
            Image (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => selectImage(event.target.files?.[0])}
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF; 3 MB maximum.
            </span>
          </label>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Selected post image preview"
              className="block max-h-80 w-full rounded-xl border border-border object-contain"
            />
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing…" : "Publish post"}
          </Button>
        </form>
      </section>
    </main>
  );
}
