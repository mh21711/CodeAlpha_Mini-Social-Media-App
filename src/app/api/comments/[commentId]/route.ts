import {
  ApiError,
  getAuthenticatedUser,
  isObjectId,
  routeError,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import User from "@/models/User";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/comments/[commentId]">,
) {
  try {
    const user = await getAuthenticatedUser();
    const { commentId } = await context.params;
    if (!isObjectId(commentId)) {
      throw new ApiError("Invalid comment ID.", 400);
    }

    await connectDB();
    const root = await Comment.findById(commentId);
    if (!root) throw new ApiError("Comment not found.", 404);
    if (root.author.toString() !== user.id) {
      throw new ApiError("You cannot delete this comment.", 403);
    }

    const commentIds = [root._id];
    let parentIds = [root._id];
    while (parentIds.length > 0) {
      const children = await Comment.find({
        parentCommentId: { $in: parentIds },
        post: root.post,
      }).distinct("_id");
      parentIds = children;
      commentIds.push(...children);
    }

    const deletedComments = await Comment.find({ _id: { $in: commentIds } })
      .select("author")
      .lean();
    await Comment.deleteMany({ _id: { $in: commentIds } });
    await Post.updateOne(
      { _id: root.post },
      { $pull: { comments: { $in: commentIds } } },
    );

    const authorIds = [
      ...new Set(deletedComments.map((comment) => comment.author.toString())),
    ];
    await Promise.all(
      authorIds.map(async (authorId) => {
        const remainingComments = await Comment.exists({
          post: root.post,
          author: authorId,
        });
        if (!remainingComments) {
          await User.updateOne(
            { _id: authorId },
            { $pull: { commentedPosts: root.post } },
          );
        }
      }),
    );

    return Response.json({ deleted: true, deletedComments: commentIds.length });
  } catch (error) {
    return routeError(error);
  }
}
