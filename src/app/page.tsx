import { PostFeed } from "@/components/PostFeed";

// fix the comment interenal server error
// add a sign out button
// test the follow feature and make the delete feature and then test it on comments and posts
// don't need to add the explore home page algrothem, don't need to check if the cloudinary images is 
// actually deleted, this is a test project, don't stress yourself with features and things, no one will use it
// at all, this is all to finish this project and finally submit the form for the intership of CodeAlpha

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen max-w-[1440px]">
        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[720px] px-5 pb-24 pt-8 md:px-10">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-primary">
                Your daily space
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                Latest ideas
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Discover something new today.
              </p>
            </div>
            <PostFeed />
          </div>
        </section>
      </div>
    </main>
  );
}
