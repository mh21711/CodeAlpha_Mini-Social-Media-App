import { ApiError, routeError } from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

export async function GET(request: Request) {
  try {
    const username = new URL(request.url).searchParams
      .get("username")
      ?.trim()
      .toLowerCase();

    if (!username || !usernamePattern.test(username)) {
      throw new ApiError(
        "Username must be 3–30 characters using lowercase letters, numbers, and underscores.",
        400,
      );
    }

    await connectDB();
    const available = !(await User.exists({ username }));
    return Response.json({ username, available });
  } catch (error) {
    return routeError(error);
  }
}
