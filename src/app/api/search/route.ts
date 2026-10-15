import { ApiError, routeError } from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length > 100) {
      throw new ApiError("Search query must be 100 characters or fewer.", 400);
    }
    if (!query) {
      return Response.json({ query, users: [], posts: [] });
    }

    await connectDB();
    const [users, posts] = await Promise.all([
      User.find({
        $text: { $search: query },
        usernameIsCustom: true,
      })
        .select("username name image bio followers following")
        .sort({ score: { $meta: "textScore" } })
        .limit(20)
        .lean(),
      Post.find({ $text: { $search: query } })
        .sort({ score: { $meta: "textScore" } })
        .limit(20)
        .populate("author", "name username image")
        .lean(),
    ]);

    return Response.json({ query, users, posts });
  } catch (error) {
    return routeError(error);
  }
}
