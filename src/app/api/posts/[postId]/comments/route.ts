import {
  ApiError,
  getAuthenticatedUser,
  getString,
  isObjectId,
  readJsonObject,
  routeError,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import User from "@/models/User";

export async function GET(
  request: Request,
  context: RouteContext<"/api/posts/[postId]/comments">,
) {
  try {
    const { postId } = await context.params;
    if (!isObjectId(postId)) throw new ApiError("Invalid post ID.", 400);

    await connectDB();
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) throw new ApiError("Post not found.", 404);

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("author", "name username image")
      .populate("likes", "name username")
      .lean();

    return Response.json({
      comments,
      count: comments.length,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/posts/[postId]/comments">,
) {
  try {
    const user = await getAuthenticatedUser();
    const { postId } = await context.params;
    if (!isObjectId(postId)) throw new ApiError("Invalid post ID.", 400);

    const body = await readJsonObject(request);
    const text = getString(body.text, "text", {
      required: true,
      maxLength: 3000,
    })!;
    const parentCommentId = getString(body.parentCommentId, "parentCommentId");
    if (parentCommentId && !isObjectId(parentCommentId)) {
      throw new ApiError("Invalid parentCommentId.", 400);
    }

    await connectDB();
    const post = await Post.findById(postId);
    if (!post) throw new ApiError("Post not found.", 404);

    if (parentCommentId) {
      const parent = await Comment.findOne({
        _id: parentCommentId,
        post: post._id,
      });
      if (!parent) {
        throw new ApiError("Parent comment does not belong to this post.", 400);
      }
    }

    const comment = await Comment.create({
      author: user._id,
      post: post._id,
      text,
      parentCommentId,
    });

    await Promise.all([
      Post.updateOne({ _id: post._id }, { $addToSet: { comments: comment._id } }),
      User.updateOne(
        { _id: user._id },
        { $addToSet: { commentedPosts: post._id } },
      ),
    ]);

    await comment.populate("author", "name username image");
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
