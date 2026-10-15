import { ApiError, getAuthenticatedUser, routeError } from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/users/[username]/follow">,
) {
  try {
    const currentUser = await getAuthenticatedUser();
    const { username } = await context.params;
    const targetUser = await User.findOne({
      username: username.toLowerCase(),
      usernameIsCustom: true,
    });

    if (!targetUser) {
      throw new ApiError("User not found.", 404);
    }
    if (targetUser.id === currentUser.id) {
      throw new ApiError("You cannot follow yourself.", 400);
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetUser.id,
    );
    const operation = isFollowing ? "$pull" : "$addToSet";

    await connectDB();
    await Promise.all([
      User.updateOne(
        { _id: currentUser._id },
        { [operation]: { following: targetUser._id } },
      ),
      User.updateOne(
        { _id: targetUser._id },
        { [operation]: { followers: currentUser._id } },
      ),
    ]);

    return Response.json({
      following: !isFollowing,
      followersCount: targetUser.followers.length + (isFollowing ? -1 : 1),
    });
  } catch (error) {
    return routeError(error);
  }
}
