import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 flex h-[82px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md md:px-10">
      <Link href="/" className="flex items-center gap-3 lg:hidden">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-bold">mingle</span>
      </Link>
      <form
        action="/search"
        className="relative hidden max-w-md flex-1 md:block"
      >
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          aria-label="Search people and posts"
          placeholder="Search people, posts, and ideas"
          className="h-10 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
        />
      </form>
      <div className="flex items-center gap-2">
        <Link
          href="/search"
          aria-label="Search"
          className="inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="size-5" />
        </Link>
        <ThemeToggle />
        <Link
          href="/createpost"
          className="inline-flex h-8 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Create a post
        </Link>
      </div>
    </header>
  );
}
