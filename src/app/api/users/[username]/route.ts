import { ApiError, routeError } from "@/lib/api-utils";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import User from "@/models/User";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/users/[username]">,
) {
  try {
    const { username } = await context.params;
    await connectDB();

    const user = await User.findOne({
      username: username.toLowerCase(),
      usernameIsCustom: true,
    })
      .select("-email")
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "author", select: "name username image" },
      })
      .populate({
        path: "likedPosts",
        populate: { path: "author", select: "name username image" },
      })
      .populate({
        path: "commentedPosts",
        populate: { path: "author", select: "name username image" },
      });

    if (!user) {
      throw new ApiError("User not found.", 404);
    }

    const session = await getServerSession(authOptions);
    const isFollowing = session?.user?.id
      ? user.followers.some((followerId) => followerId.toString() === session.user.id)
      : false;

    return Response.json({
      user: user.toObject(),
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing,
    });
  } catch (error) {
    return routeError(error);
  }
}
