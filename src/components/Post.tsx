"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";

type CommentLiker = {
  _id: string;
  name: string;
  username?: string;
};

export type PostCommentData = {
  _id: string;
  text: string;
  createdAt?: string;
  parentCommentId?: string;
  replies?: PostCommentData[];
  author?: {
    _id?: string;
    username?: string;
    name?: string;
    image?: string;
  };
  likes?: CommentLiker[];
};

export type PostData = {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  author?: {
    _id?: string;
    name?: string;
    username?: string;
    image?: string;
  };
  likes?: string[];
  comments?: (string | PostCommentData)[];
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  createdAt?: string;
};

type CommentThreadProps = {
  comment: PostCommentData;
  currentUserId?: string;
  currentUsername?: string;
  replyTarget: string | null;
  replyText: string;
  isReplying: boolean;
  likingCommentIds: Set<string>;
  deletingCommentIds: Set<string>;
  onReply: (commentId: string) => void;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>, commentId: string) => void;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
};

function CommentThread({
  comment,
  currentUserId,
  currentUsername,
  replyTarget,
  replyText,
  isReplying,
  likingCommentIds,
  deletingCommentIds,
  onReply,
  onReplyTextChange,
  onReplySubmit,
  onLike,
  onDelete,
}: CommentThreadProps) {
  const liked =
    currentUserId !== undefined &&
    Boolean(comment.likes?.some((user) => user._id === currentUserId));
  const canDeleteComment =
    currentUsername !== undefined &&
    currentUsername === comment.author?.username;
  const repliesTargetingThis = replyTarget === comment._id;

  return (
    <li className="min-w-0">
      <div className="flex gap-2.5">
        {comment.author?.image ? (
          <Image
            src={comment.author.image}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserRound className="size-4 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {comment.author?.name ?? "Unknown user"}
            {comment.author?.username && (
              <span className="ml-2 font-normal text-muted-foreground">
                @{comment.author.username}
              </span>
            )}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {comment.text}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              aria-pressed={liked}
              aria-label={liked ? "Unlike comment" : "Like comment"}
              title={currentUserId ? undefined : "Sign in to like comments"}
              disabled={!currentUserId || likingCommentIds.has(comment._id)}
              onClick={() => onLike(comment._id)}
              className={`inline-flex items-center gap-1 text-xs ${
                liked ? "text-rose-500" : "text-muted-foreground"
              }`}
            >
              <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
              {comment.likes?.length ?? 0}
            </button>
            {currentUserId && (
              <button
                type="button"
                onClick={() => onReply(comment._id)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {comment.createdAt && (
              <time
                dateTime={comment.createdAt}
                className="text-xs text-muted-foreground"
              >
                {new Date(comment.createdAt).toLocaleDateString()}
              </time>
            )}
            {canDeleteComment && (
              <button
                type="button"
                aria-label="Delete comment"
                title="Delete comment"
                disabled={deletingCommentIds.has(comment._id)}
                onClick={() => onDelete(comment._id)}
                className="inline-flex items-center text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
          {repliesTargetingThis && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => onReplySubmit(event, comment._id)}
            >
              <input
                aria-label="Write a reply"
                value={replyText}
                onChange={(event) => onReplyTextChange(event.target.value)}
                maxLength={3000}
                placeholder="Write a reply…"
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" disabled={isReplying}>
                {isReplying ? "Sending…" : "Reply"}
              </Button>
            </form>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <ul className="mt-3 flex flex-col gap-4 border-l-2 border-border pl-4">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  replyTarget={replyTarget}
                  replyText={replyText}
                  isReplying={isReplying}
                  likingCommentIds={likingCommentIds}
                  deletingCommentIds={deletingCommentIds}
                  onReply={onReply}
                  onReplyTextChange={onReplyTextChange}
                  onReplySubmit={onReplySubmit}
                  onLike={onLike}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

type CommentTree = PostCommentData & { replies: CommentTree[] };

function buildCommentTree(comments: PostCommentData[]): CommentTree[] {
  const byId = new Map<string, CommentTree>();
  const roots: CommentTree[] = [];

  for (const comment of comments) {
    byId.set(comment._id, { ...comment, replies: [] });
  }
  for (const comment of comments) {
    const item = byId.get(comment._id)!;
    const parent = comment.parentCommentId
      ? byId.get(comment.parentCommentId)
      : undefined;
    if (parent) parent.replies.push(item);
    else roots.push(item);
  }
  return roots;
}

function getCommentBranchIds(
  comments: PostCommentData[],
  rootCommentId: string,
): Set<string> {
  const commentIds = new Set([rootCommentId]);
  let addedComment = true;

  while (addedComment) {
    addedComment = false;
    for (const comment of comments) {
      if (
        comment.parentCommentId &&
        commentIds.has(comment.parentCommentId) &&
        !commentIds.has(comment._id)
      ) {
        commentIds.add(comment._id);
        addedComment = true;
      }
    }
  }

  return commentIds;
}

export default function Post({
  post,
  onDelete,
}: {
  post: PostData;
  onDelete?: (postId: string) => Promise<void>;
}) {
  const { data: session } = useSession();
  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const liked =
    likedOverride ??
    post.isLiked ??
    (session?.user.id
      ? (post.likes?.some(
          (like) =>
            typeof like === "string" && like === session.user.id,
        ) ?? false)
      : false);
  const [likesCount, setLikesCount] = useState(
    post.likesCount ?? post.likes?.length ?? 0,
  );
  const [commentsCount, setCommentsCount] = useState(
    post.commentsCount ?? post.comments?.length ?? 0,
  );
  const [comments, setComments] = useState<PostCommentData[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [visibleRootComments, setVisibleRootComments] = useState(3);
  const [newComment, setNewComment] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [likingCommentIds, setLikingCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const [deletingCommentIds, setDeletingCommentIds] = useState<Set<string>>(
    new Set(),
  );
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isLiking, setIsLiking] = useState(false);

  const toggleLike = async () => {
    if (isLiking) return;
    const previousLiked = liked;
    const previousLikesCount = likesCount;
    setLikedOverride(!previousLiked);
    setLikesCount((count) => count + (previousLiked ? -1 : 1));
    setIsLiking(true);
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        liked?: boolean;
        likesCount?: number;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not update the like.");
      }
      if (
        typeof result.liked !== "boolean" ||
        typeof result.likesCount !== "number"
      ) {
        throw new Error("The server returned an invalid like response.");
      }
      setLikedOverride(result.liked);
      setLikesCount(result.likesCount);
    } catch (error) {
      setLikedOverride(previousLiked);
      setLikesCount(previousLikesCount);
      setActionError(
        error instanceof Error ? error.message : "Could not update the like.",
      );
    } finally {
      setIsLiking(false);
    }
  };

  async function toggleComments() {
    const shouldOpen = !commentsOpen;
    setCommentsOpen(shouldOpen);
    setActionError("");
    if (!shouldOpen || commentsLoaded || isLoadingComments) return;

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/posts/${post._id}/comments`);
      const result = (await response.json()) as {
        error?: string;
        comments?: PostCommentData[];
        count?: number;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not load comments.");
      }
      if (!Array.isArray(result.comments)) {
        throw new Error("The server returned an invalid comments response.");
      }
      setComments(result.comments);
      setCommentsCount(result.count ?? result.comments.length);
      setCommentsLoaded(true);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not load comments.",
      );
    } finally {
      setIsLoadingComments(false);
    }
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>,
    parentCommentId?: string,
  ) {
    event.preventDefault();
    const text = (parentCommentId ? replyText : newComment).trim();
    if (!text || isSubmittingComment || isReplying) return;
    setActionError("");
    if (parentCommentId) setIsReplying(true);
    else setIsSubmittingComment(true);

    try {
      const response = await fetch(`/api/posts/${post._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, parentCommentId }),
      });
      const result = (await response.json()) as {
        error?: string;
        comment?: PostCommentData;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not add your comment.");
      }
      if (!result.comment) {
        throw new Error("The server returned an invalid comment response.");
      }
      setComments((current) => [...current, result.comment!]);
      setCommentsCount((count) => count + 1);
      setCommentsLoaded(true);
      if (parentCommentId) {
        setReplyTarget(null);
        setReplyText("");
      } else {
        setNewComment("");
        setVisibleRootComments((count) => count + 1);
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not add your comment.",
      );
    } finally {
      if (parentCommentId) setIsReplying(false);
      else setIsSubmittingComment(false);
    }
  }

  async function toggleCommentLike(commentId: string) {
    if (!session?.user.id || likingCommentIds.has(commentId)) return;
    setActionError("");
    setLikingCommentIds((current) => new Set(current).add(commentId));
    try {
      const response = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: string;
        likes?: CommentLiker[];
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not update the comment like.");
      }
      if (!Array.isArray(result.likes)) {
        throw new Error("The server returned an invalid like response.");
      }
      setComments((current) =>
        current.map((comment) =>
          comment._id === commentId
            ? { ...comment, likes: result.likes }
            : comment,
        ),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update the comment like.",
      );
    } finally {
      setLikingCommentIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });
    }
  }

  async function deleteComment(commentId: string) {
    if (deletingCommentIds.has(commentId)) return;
    setActionError("");
    setDeletingCommentIds((current) => new Set(current).add(commentId));
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        error?: string;
        deleted?: boolean;
        deletedComments?: number;
      };
      const deletedCommentCount = result.deletedComments;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete this comment.");
      }
      if (
        result.deleted !== true ||
        typeof deletedCommentCount !== "number"
      ) {
        throw new Error(
          "The server returned an invalid comment deletion response.",
        );
      }

      const deletedIds = getCommentBranchIds(comments, commentId);
      setComments((current) =>
        current.filter((comment) => !deletedIds.has(comment._id)),
      );
      setCommentsCount((count) =>
        Math.max(0, count - deletedCommentCount),
      );
      setReplyTarget((current) =>
        current && deletedIds.has(current) ? null : current,
      );
      setCommentsLoaded(true);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not delete this comment.",
      );
    } finally {
      setDeletingCommentIds((current) => {
        const next = new Set(current);
        next.delete(commentId);
        return next;
      });
    }
  }

  async function deletePost() {
    if (!onDelete || isDeleting) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setIsDeleting(true);
    setActionError("");
    try {
      await onDelete(post._id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not delete this post.",
      );
      setIsDeleting(false);
    }
  }

  const copyPostLink = async () => {
    const postUrl = new URL("/search", window.location.origin);
    postUrl.searchParams.set("id", post._id);

    try {
      await navigator.clipboard.writeText(postUrl.toString());
      setActionMessage("Post link copied.");
      setActionError("");
    } catch {
      setActionError("Could not copy the post link.");
    }
  };

  const authorName = post.author?.name ?? "Unknown user";
  const username = post.author?.username;
  const commentTree = buildCommentTree(comments);
  const shownComments = commentTree.slice(0, visibleRootComments);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgb(15_23_42/0.04)]">
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={post.author?.image?.trim() || DEFAULT_AVATAR}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0">
            {username ? (
              <Link
                href={`/profile/${encodeURIComponent(username)}`}
                className="block truncate text-sm font-semibold hover:underline"
              >
                {authorName}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold">{authorName}</p>
            )}
            {username && (
              <p className="truncate text-xs text-muted-foreground">
                @{username}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete post"
              title="Delete post"
              onClick={deletePost}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 />
            </Button>
          )}
          {post.createdAt && (
            <time
              dateTime={post.createdAt}
              className="ml-1 shrink-0 text-xs text-muted-foreground"
            >
              {new Date(post.createdAt).toLocaleDateString()}
            </time>
          )}
        </div>
      </div>
      <div className="px-5 pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {post.title}
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {post.description}
        </p>
      </div>
      {post.imageUrl && (
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[480px] overflow-hidden bg-card">
          <Image
            src={post.imageUrl}
            alt=""
            fill
            sizes="(max-width: 520px) 100vw, 480px"
            className="object-contain"
          />
        </div>
      )}
      <div className="flex items-center gap-1 px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLike}
          disabled={isLiking}
          aria-pressed={liked}
          className={liked ? "text-rose-500" : "text-muted-foreground"}
        >
          <Heart
            data-icon="inline-start"
            className={liked ? "fill-current" : ""}
          />
          {likesCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          className="text-muted-foreground"
        >
          <MessageCircle data-icon="inline-start" />
          {commentsCount}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copy post link"
          title="Copy post link"
          onClick={copyPostLink}
          className="rounded-full text-muted-foreground"
        >
          <Share2 />
        </Button>
      </div>
      {actionError && (
        <p className="px-5 pb-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
      {actionMessage && (
        <p className="px-5 pb-3 text-sm text-muted-foreground" role="status">
          {actionMessage}
        </p>
      )}
      {commentsOpen && (
        <section
          id="comments"
          className="border-t border-border px-5 py-4"
        >
          {session?.user.id ? (
            <form
              className="mb-5 flex gap-2"
              onSubmit={(event) => submitComment(event)}
            >
              <input
                aria-label="Write a comment"
                value={newComment}
                onChange={(event) => setNewComment(event.target.value)}
                maxLength={3000}
                placeholder="Write a comment…"
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" disabled={isSubmittingComment}>
                {isSubmittingComment ? "Sending…" : "Comment"}
              </Button>
            </form>
          ) : (
            <p className="mb-5 text-sm text-muted-foreground">
              <Link href="/signin" className="font-medium text-primary hover:underline">
                Sign in
              </Link>{" "}
              to join the conversation.
            </p>
          )}
          {isLoadingComments ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading comments…
            </p>
          ) : comments.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              No comments yet.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-5">
                {shownComments.map((comment) => (
                  <CommentThread
                    key={comment._id}
                    comment={comment}
                    currentUserId={session?.user.id}
                    currentUsername={session?.user.username}
                    replyTarget={replyTarget}
                    replyText={replyText}
                    isReplying={isReplying}
                    likingCommentIds={likingCommentIds}
                    deletingCommentIds={deletingCommentIds}
                    onReply={(commentId) => {
                      setReplyTarget((current) =>
                        current === commentId ? null : commentId,
                      );
                      setReplyText("");
                    }}
                    onReplyTextChange={setReplyText}
                    onReplySubmit={submitComment}
                    onLike={toggleCommentLike}
                    onDelete={(commentId) => void deleteComment(commentId)}
                  />
                ))}
              </ul>
              {visibleRootComments < commentTree.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setVisibleRootComments((count) => count + 3)
                  }
                  className="mt-4 text-primary"
                >
                  Show more comments
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </article>
  );
}
