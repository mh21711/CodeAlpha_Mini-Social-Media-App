import {
  ApiError,
  getAuthenticatedUser,
  isObjectId,
  routeError,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import User from "@/models/User";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/posts/[postId]">,
) {
  try {
    const { postId } = await context.params;
    if (!isObjectId(postId)) throw new ApiError("Invalid post ID.", 400);

    await connectDB();
    const post = await Post.findById(postId)
      .populate("author", "name username image")
      .populate({
        path: "comments",
        options: { sort: { createdAt: 1 } },
        populate: { path: "author", select: "name username image" },
      });

    if (!post) throw new ApiError("Post not found.", 404);
    return Response.json({
      post: {
        ...post.toObject(),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/posts/[postId]">,
) {
  try {
    const user = await getAuthenticatedUser();
    const { postId } = await context.params;
    if (!isObjectId(postId)) throw new ApiError("Invalid post ID.", 400);

    await connectDB();
    const post = await Post.findById(postId);
    if (!post) throw new ApiError("Post not found.", 404);
    if (post.author.toString() !== user.id) {
      throw new ApiError("You cannot delete this post.", 403);
    }

    if (post.imageUrl) {
      await deleteCloudinaryImage(post.imageUrl);
    }

    const linkedComments = await Comment.find({
      $or: [{ post: post._id }, { _id: { $in: post.comments } }],
    })
      .select("_id")
      .lean();
    const commentIds = linkedComments.map((comment) => comment._id);
    await Promise.all([
      Comment.deleteMany({ _id: { $in: commentIds } }),
      User.updateMany(
        {},
        {
          $pull: {
            posts: post._id,
            likedPosts: post._id,
            commentedPosts: post._id,
          },
        },
      ),
    ]);
    await Post.deleteOne({ _id: post._id });

    return Response.json({ deleted: true, deletedComments: commentIds.length });
  } catch (error) {
    return routeError(error);
  }
}
