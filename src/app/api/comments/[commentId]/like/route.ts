import {
  ApiError,
  getAuthenticatedUser,
  isObjectId,
  routeError,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import Comment from "@/models/Comment";

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    const { commentId } = await context.params;
    if (!isObjectId(commentId)) {
      throw new ApiError("Invalid comment ID.", 400);
    }

    await connectDB();
    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError("Comment not found.", 404);

    const alreadyLiked = comment.likes.some(
      (userId) => userId.toString() === user.id,
    );
    await Comment.updateOne(
      { _id: comment._id },
      alreadyLiked
        ? { $pull: { likes: user._id } }
        : { $addToSet: { likes: user._id } },
    );
    const updatedComment = await Comment.findById(comment._id)
      .populate("likes", "name username")
      .lean();
    if (!updatedComment) throw new ApiError("Comment not found.", 404);

    return Response.json({
      liked: !alreadyLiked,
      likes: updatedComment.likes,
      likesCount: updatedComment.likes.length,
    });
  } catch (error) {
    return routeError(error);
  }
}
