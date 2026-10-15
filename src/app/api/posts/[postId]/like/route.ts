import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import {
  ApiError,
  isObjectId,
  routeError,
} from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/posts/[postId]/like">,
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new ApiError("Sign in to continue.", 401);
    }
    if (!session.user.usernameIsCustom) {
      throw new ApiError("Choose a unique username to continue.", 409);
    }

    const userId = session.user.id;
    if (!isObjectId(userId)) {
      throw new ApiError("Invalid authenticated user.", 401);
    }
    const { postId } = await context.params;
    if (!isObjectId(postId)) throw new ApiError("Invalid post ID.", 400);

    await connectDB();
    const post = await Post.findById(postId);
    if (!post) throw new ApiError("Post not found.", 404);

    const userObjectId = new Types.ObjectId(userId);
    const isLiked = post.likes.some((id) => id.toString() === userId);
    const operation = isLiked ? "$pull" : "$addToSet";
    await Promise.all([
      Post.updateOne(
        { _id: post._id },
        { [operation]: { likes: userObjectId } },
      ),
      User.updateOne(
        { _id: userObjectId },
        { [operation]: { likedPosts: post._id } },
      ),
    ]);

    return Response.json({
      liked: !isLiked,
      likesCount: post.likes.length + (isLiked ? -1 : 1),
    });
  } catch (error) {
    return routeError(error);
  }
}
