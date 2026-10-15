"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import Post, {
  type PostCommentData,
  type PostData,
} from "@/components/Post";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";

type SearchUser = {
  _id: string;
  username: string;
  name: string;
  image?: string;
  bio?: string;
};

type DetailedPost = Omit<PostData, "comments"> & {
  comments?: PostCommentData[];
};

type SearchResponse = {
  error?: string;
  post?: DetailedPost;
  posts?: PostData[];
  users?: SearchUser[];
};

type SearchResult = {
  key: string;
  post?: DetailedPost;
  posts: PostData[];
  users: SearchUser[];
  error?: string;
};

function SearchContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";
  const resultKey = id ? `post:${id}` : query ? `query:${query}` : "empty";
  const [result, setResult] = useState<SearchResult>({
    key: "",
    posts: [],
    users: [],
  });

  useEffect(() => {
    if (resultKey === "empty") return;

    const controller = new AbortController();

    async function loadResults() {
      try {
        const endpoint = id
          ? `/api/posts/${encodeURIComponent(id)}`
          : `/api/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(endpoint, { signal: controller.signal });
        const data = (await response.json()) as SearchResponse;
        if (!response.ok) {
          throw new Error(data.error ?? "Search could not be completed.");
        }

        if (id && !data.post) {
          throw new Error("The server returned an invalid post response.");
        }
        if (!id && (!Array.isArray(data.posts) || !Array.isArray(data.users))) {
          throw new Error("The server returned an invalid search response.");
        }

        setResult({
          key: resultKey,
          post: data.post,
          posts: data.posts ?? [],
          users: data.users ?? [],
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult({
          key: resultKey,
          posts: [],
          users: [],
          error:
            error instanceof Error
              ? error.message
              : "Search could not be completed.",
        });
      }
    }

    void loadResults();
    return () => controller.abort();
  }, [id, query, resultKey]);

  const isLoading = resultKey !== "empty" && result.key !== resultKey;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">
        {id ? "Post" : "Search"}
      </h1>

      {!id && (
        <form action="/search" className="relative mb-8">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={query}
            aria-label="Search people and posts"
            placeholder="Search people and posts"
            className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
          />
        </form>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {id ? "Loading post…" : "Searching…"}
        </p>
      ) : resultKey === "empty" ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Enter a search to find people and posts.
        </p>
      ) : result.error ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-destructive">
          {result.error}
        </p>
      ) : id && result.post ? (
        <div className="flex flex-col gap-6">
          <Post post={result.post} />
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {result.users.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">People</h2>
              <ul className="flex flex-col gap-3">
                {result.users.map((user) => (
                  <li key={user._id}>
                    <Link
                      href={`/profile/${encodeURIComponent(user.username)}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50"
                    >
                      <Image
                        src={user.image?.trim() || DEFAULT_AVATAR}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      </span>
                      {user.bio && (
                        <span className="ml-auto hidden max-w-[50%] truncate text-sm text-muted-foreground sm:block">
                          {user.bio}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-3 text-lg font-semibold">Posts</h2>
            {result.posts.length > 0 ? (
              <div className="flex flex-col gap-5">
                {result.posts.map((post) => (
                  <Post key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No posts matched “{query}”.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading search…
          </p>
        </main>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
