import { UsersRound } from "lucide-react";
import { PostFeed } from "@/components/PostFeed";

export default function FollowingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-8 pt-12">
      <div className="mb-8 flex items-center gap-3">
        <UsersRound className="size-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Following</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Posts from people you follow.
          </p>
        </div>
      </div>
      <PostFeed feed="following" />
    </main>
  );
}
