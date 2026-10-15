import { Suspense } from "react";
import ProfileContent from "@/components/ProfileContent";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

async function ProfileRoute({ params }: ProfilePageProps) {
  const { username } = await params;
  return <ProfileContent username={username} />;
}

export default function ProfilePage(props: ProfilePageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading profile…
          </p>
        </main>
      }
    >
      <ProfileRoute params={props.params} />
    </Suspense>
  );
}
