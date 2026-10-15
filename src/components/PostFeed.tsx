"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Post, { type PostData } from "@/components/Post";

type FeedResponse = {
  posts: PostData[];
  error?: string;
};

export function PostFeed({
  feed = "home",
}: {
  feed?: "home" | "following";
}) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      try {
        const endpoint =
          feed === "following"
            ? "/api/posts?feed=following"
            : "/api/posts?page=1&limit=10";
        const response = await fetch(endpoint, { signal: controller.signal });
        const result = (await response.json()) as FeedResponse;

        if (!response.ok) {
          throw new Error(result.error ?? "Could not load posts.");
        }
        if (!Array.isArray(result.posts)) {
          throw new Error("The server returned an invalid posts response.");
        }

        setPosts(result.posts);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load posts.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPosts();
    return () => controller.abort();
  }, [feed]);

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Loading posts…
      </p>
    );
  }

  if (error) {
    const needsSignIn = error === "Sign in to view posts from people you follow.";
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="font-semibold">{error}</p>
        {needsSignIn && (
          <Link
            href="/signin"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Search className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="font-semibold">No posts yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {feed === "following"
            ? "Posts from people you follow will appear here."
            : "Check back soon for new ideas."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {posts.map((post) => (
        <Post key={post._id} post={post} />
      ))}
    </div>
  );
}
