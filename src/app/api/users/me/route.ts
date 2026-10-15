import {
  ApiError,
  getAuthenticatedUser,
  getImageFile,
  getString,
  readJsonObject,
  routeError,
  validateImageUrl,
} from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import { deleteCloudinaryImage, uploadImageBuffer } from "@/lib/cloudinary";
import User from "@/models/User";

const usernamePattern = /^[a-z0-9_]{3,30}$/;

export async function GET() {
  try {
    const user = await getAuthenticatedUser({ allowIncompleteUsername: true });
    return Response.json({
      user: {
        id: user.id,
        username: user.username,
        usernameIsCustom: user.usernameIsCustom,
        name: user.name,
        email: user.email,
        image: user.image,
        bio: user.bio,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
      requiresUsername: !user.usernameIsCustom,
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: Request) {
  let uploadedImageUrl: string | undefined;
  let profileUpdated = false;
  try {
    const user = await getAuthenticatedUser({ allowIncompleteUsername: true });
    let body: Record<string, unknown>;
    let imageFile: File | undefined;
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await request.formData();
      body = Object.fromEntries(
        [...formData.entries()].filter(
          ([key, value]) => key !== "image" && typeof value === "string",
        ),
      );
      imageFile = getImageFile(formData);
    } else {
      body = await readJsonObject(request);
    }
    const updates: Record<string, string | boolean> = {};

    if (body.username !== undefined) {
      const username = getString(body.username, "username", {
        required: true,
        maxLength: 30,
      })!.toLowerCase();

      if (!usernamePattern.test(username)) {
        throw new ApiError(
          "Username must be 3–30 characters using lowercase letters, numbers, and underscores.",
          400,
        );
      }

      await connectDB();
      const taken = await User.exists({
        username,
        _id: { $ne: user._id },
      });
      if (taken) {
        throw new ApiError("That username is already taken.", 409);
      }

      updates.username = username;
      updates.usernameIsCustom = true;
    }

    const name = getString(body.name, "name", {
      required: body.name !== undefined,
      maxLength: 80,
    });
    const bio = getString(body.bio, "bio", { maxLength: 300 });
    const imageUrl = validateImageUrl(
      getString(body.image, "image", { maxLength: 2048 }),
    );

    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (imageUrl !== undefined) updates.image = imageUrl;

    if (imageFile) {
      const uploadedImage = await uploadImageBuffer(
        Buffer.from(await imageFile.arrayBuffer()),
        { folder: "mingle/profiles" },
      );
      uploadedImageUrl = uploadedImage.secure_url;
      updates.image = uploadedImage.secure_url;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError("Provide at least one profile field to update.", 400);
    }

    const previousImage = user.image;
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-email");
    if (!updatedUser) {
      throw new ApiError("Your profile could not be updated.", 500);
    }
    profileUpdated = true;

    let cleanupWarning: string | undefined;
    if (previousImage && previousImage !== updatedUser.image) {
      try {
        await deleteCloudinaryImage(previousImage);
      } catch (cleanupError) {
        console.error("[api] Could not delete previous profile image:", cleanupError);
        cleanupWarning =
          "Your profile was updated, but the previous image could not be deleted.";
      }
    }

    return Response.json({
      user: updatedUser,
      requiresUsername: !updatedUser?.usernameIsCustom,
      cleanupWarning,
    });
  } catch (error) {
    if (uploadedImageUrl && !profileUpdated) {
      try {
        await deleteCloudinaryImage(uploadedImageUrl);
      } catch (cleanupError) {
        console.error("[api] Could not clean up an unused profile image:", cleanupError);
      }
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return Response.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }
    return routeError(error);
  }
}
