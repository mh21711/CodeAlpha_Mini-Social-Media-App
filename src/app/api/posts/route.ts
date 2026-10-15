import {
  ApiError,
  getAuthenticatedUser,
  getImageFile,
  getString,
  parsePositiveInteger,
  readJsonObject,
  routeError,
  validateImageUrl,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import { deleteCloudinaryImage, uploadImageBuffer } from "@/lib/cloudinary";
import Post from "@/models/Post";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const page = parsePositiveInteger(url.searchParams.get("page"), 1, 100_000);
    const limit = parsePositiveInteger(url.searchParams.get("limit"), 10, 10);
    const feed = url.searchParams.get("feed");
    if (feed !== null && feed !== "following") {
      throw new ApiError("Feed must be 'following'.", 400);
    }

    let sessionUser = null;
    try {
      sessionUser = await getAuthenticatedUser({ allowIncompleteUsername: true });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }

    if (feed === "following" && !sessionUser) {
      throw new ApiError("Sign in to view posts from people you follow.", 401);
    }

    const filter =
      feed === "following" ? { author: { $in: sessionUser?.following } } : {};
    const candidates = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate("author", "name username usernameIsCustom image");

    const maxEngagement = Math.max(
      1,
      ...candidates.map((post) => post.likes.length + post.comments.length),
    );
    const following = new Set(
      sessionUser?.following.map((id) => id.toString()) ?? [],
    );
    const now = Date.now();
    const ranked = candidates
      .map((post) => {
        const engagement =
          (post.likes.length + post.comments.length) / maxEngagement;
        const ageHours = Math.max(
          0,
          (now - (post.createdAt?.getTime() ?? now)) / 3_600_000,
        );
        const discovery =
          (1 / (1 + ageHours / 24)) / (1 + Math.log1p(post.impressions));
        const affinity = following.has(post.author._id.toString()) ? 1 : 0;
        const score = 0.3 * affinity + 0.5 * engagement + 0.2 * discovery;

        return { post, score };
      })
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.post.createdAt?.getTime() ?? 0) -
            (left.post.createdAt?.getTime() ?? 0),
      );

    const start = (page - 1) * limit;
    const pageItems = ranked.slice(start, start + limit);
    const ids = pageItems.map(({ post }) => post._id);
    if (ids.length > 0) {
      await Post.updateMany({ _id: { $in: ids } }, { $inc: { impressions: 1 } });
    }

    return Response.json({
      posts: pageItems.map(({ post }) => ({
        ...post.toObject(),
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
        isLiked: sessionUser
          ? post.likes.some((id) => id.toString() === sessionUser.id)
          : false,
      })),
      page,
      limit,
      hasMore: start + limit < ranked.length,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  let uploadedImageUrl: string | undefined;
  let postCreated = false;
  try {
    const user = await getAuthenticatedUser();
    let body: Record<string, unknown>;
    let imageFile: File | undefined;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      imageFile = getImageFile(formData, "image");
    } else {
      body = await readJsonObject(request);
    }
    const title = getString(body.title, "title", {
      required: true,
      maxLength: 180,
    })!;
    const description = getString(body.description, "description", {
      required: true,
      maxLength: 10_000,
    })!;
    let imageUrl = validateImageUrl(
      getString(body.imageUrl, "imageUrl", { maxLength: 2048 }),
    );

    if (imageFile) {
      const uploadedImage = await uploadImageBuffer(
        Buffer.from(await imageFile.arrayBuffer()),
        { folder: "mingle/posts" },
      );
      uploadedImageUrl = uploadedImage.secure_url;
      imageUrl = uploadedImage.secure_url;
    }

    await connectDB();
    const post = await Post.create({
      title,
      description,
      imageUrl,
      author: user._id,
    });
    await User.updateOne({ _id: user._id }, { $addToSet: { posts: post._id } });
    postCreated = true;

    return Response.json({ post }, { status: 201 });
  } catch (error) {
    if (uploadedImageUrl && !postCreated) {
      try {
        await deleteCloudinaryImage(uploadedImageUrl);
      } catch (cleanupError) {
        console.error("[api] Could not clean up an unused post image:", cleanupError);
      }
    }
    return routeError(error);
  }
}
