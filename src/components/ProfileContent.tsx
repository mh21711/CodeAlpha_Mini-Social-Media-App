"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Pencil, UserRoundPlus, UserRoundCheck } from "lucide-react";
import Post, { type PostData } from "@/components/Post";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ProfileData = {
  name: string;
  username: string;
  image?: string;
  bio?: string;
  posts?: PostData[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
};

type ProfileResponse = {
  error?: string;
  cleanupWarning?: string;
  user?: ProfileData;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
};

export default function ProfileContent({ username }: { username: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const { data: session, status, update } = useSession();

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        const result = (await response.json()) as ProfileResponse;
        if (!response.ok) {
          throw new Error(result.error ?? "Could not load this profile.");
        }
        if (
          !result.user ||
          typeof result.followersCount !== "number" ||
          typeof result.followingCount !== "number" ||
          typeof result.isFollowing !== "boolean"
        ) {
          throw new Error("The server returned an invalid profile response.");
        }

        setProfile({
          ...result.user,
          followersCount: result.followersCount,
          followingCount: result.followingCount,
          isFollowing: result.isFollowing,
        });
        setIsFollowing(result.isFollowing);
        setNameInput(result.user.name);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load this profile.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, [username]);

  const isOwnProfile =
    status === "authenticated" &&
    Boolean(profile && session.user.username === profile.username);
  const canFollow =
    status === "authenticated" &&
    Boolean(profile && session.user.username !== profile.username);

  async function toggleFollow() {
    if (!profile || isTogglingFollow) return;
    setIsTogglingFollow(true);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(profile.username)}/follow`,
        { method: "POST" },
      );
      const result = (await response.json()) as {
        error?: string;
        following?: boolean;
        followersCount?: number;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update your follow.");
      }
      if (
        typeof result.following !== "boolean" ||
        typeof result.followersCount !== "number"
      ) {
        throw new Error("The server returned an invalid follow response.");
      }
      setIsFollowing(result.following);
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing: result.following!,
              followersCount: result.followersCount!,
            }
          : current,
      );
    } catch (followError) {
      setActionError(
        followError instanceof Error
          ? followError.message
          : "Could not update your follow.",
      );
    } finally {
      setIsTogglingFollow(false);
    }
  }

  function selectImage(file: File | undefined) {
    setActionError("");
    setActionMessage("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!allowedImageTypes.has(file.type)) {
      setImageFile(null);
      setActionError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageFile(null);
      setActionError("Profile images must be 3 MB or smaller.");
      return;
    }
    setImageFile(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setActionMessage("");
    if (!nameInput.trim()) {
      setActionError("Name is required.");
      return;
    }
    if (nameInput.trim().length > 80) {
      setActionError("Name must be 80 characters or fewer.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const formData = new FormData();
      formData.set("name", nameInput.trim());
      if (imageFile) formData.set("image", imageFile);

      const response = await fetch("/api/users/me", {
        method: "PUT",
        body: formData,
      });
      const result = (await response.json()) as ProfileResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update your profile.");
      }
      if (!result.user) {
        throw new Error("The server returned an invalid profile response.");
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              name: result.user!.name,
              image: result.user!.image,
            }
          : current,
      );
      setNameInput(result.user.name);
      setImageFile(null);
      setIsEditing(false);
      setActionMessage(result.cleanupWarning ?? "Profile updated.");
      try {
        await update();
      } catch {
        setActionMessage(
          "Profile updated. Refresh the page if your sidebar account details do not update.",
        );
      }
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update your profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function deletePost(postId: string) {
    const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "Could not delete this post.");
    }
    setProfile((current) =>
      current
        ? {
            ...current,
            posts: current.posts?.filter((post) => post._id !== postId),
          }
        : current,
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8">
      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Loading profile…
        </p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-border bg-card p-8 text-center text-sm text-destructive">
          {error}
        </p>
      ) : profile ? (
        <>
          <header className="my-8 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <Image
                src={profile.image?.trim() || DEFAULT_AVATAR}
                alt=""
                width={64}
                height={64}
                className="size-16 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold">{profile.name}</h1>
                <p className="text-sm text-muted-foreground">
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profile.bio}
                  </p>
                )}
              </div>
              {isOwnProfile && (
                <div className="flex shrink-0 gap-2">
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNameInput(profile.name);
                        setActionError("");
                        setActionMessage("");
                        setIsEditing(true);
                      }}
                    >
                      <Pencil data-icon="inline-start" />
                      Edit profile
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void signOut({ callbackUrl: "/signin" })}
                  >
                    <LogOut data-icon="inline-start" />
                    Sign out
                  </Button>
                </div>
              )}
              {canFollow && (
                <Button
                  type="button"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={toggleFollow}
                  disabled={isTogglingFollow}
                >
                  {isFollowing ? (
                    <UserRoundCheck data-icon="inline-start" />
                  ) : (
                    <UserRoundPlus data-icon="inline-start" />
                  )}
                  {isTogglingFollow
                    ? "Updating…"
                    : isFollowing
                      ? "Following"
                      : "Follow"}
                </Button>
              )}
            </div>
            <div className="mt-5 flex gap-6 text-sm">
              <p className="flex gap-1.5">
                <strong>{profile.followersCount}</strong>{" "}
                <span className="text-muted-foreground">followers</span>
              </p>
              <p className="flex gap-1.5">
                <strong>{profile.followingCount}</strong>{" "}
                <span className="text-muted-foreground">following</span>
              </p>
            </div>
            {isEditing && (
              <form
                className="mt-6 space-y-4 border-t border-border pt-5"
                onSubmit={saveProfile}
              >
                <label className="block text-sm font-medium">
                  Name
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    maxLength={80}
                    required
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-primary"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Profile image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) =>
                      selectImage(event.target.files?.[0])
                    }
                    className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">
                    JPEG, PNG, WebP, or GIF; 3 MB maximum.
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving…" : "Save profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingProfile}
                    onClick={() => {
                      setIsEditing(false);
                      setNameInput(profile.name);
                      setImageFile(null);
                      setActionError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </header>
          {actionError && (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {actionError}
            </p>
          )}
          {actionMessage && (
            <p className="mb-4 text-sm text-muted-foreground" role="status">
              {actionMessage}
            </p>
          )}
          <h2 className="mb-4 text-lg font-semibold">Posts</h2>
          {profile.posts?.length ? (
            <div className="flex flex-col gap-5">
              {profile.posts.map((post) => (
                <Post
                  key={post._id}
                  post={post}
                  onDelete={isOwnProfile ? deletePost : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              This user has not posted yet.
            </p>
          )}
        </>
      ) : null}
    </main>
  );
}
