import { Compass } from "lucide-react";
import { PostFeed } from "@/components/PostFeed";

export default function ExplorePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-12">
      <div className="mb-8 flex items-center gap-3">
        <Compass className="size-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover ideas from across the community.
          </p>
        </div>
      </div>
      <PostFeed />
    </main>
  );
}
