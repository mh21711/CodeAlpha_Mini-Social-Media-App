import bcrypt from "bcryptjs";
import { ApiError, readJsonObject, routeError } from "@/lib/api-utils";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const usernamePattern = /^[a-z0-9_]{3,30}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (
      typeof body.name !== "string" ||
      typeof body.username !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      throw new ApiError(
        "Name, username, email, and password are required.",
        400,
      );
    }

    const name = body.name.trim();
    const username = body.username.trim().toLowerCase();
    const email = body.email.trim().toLowerCase();
    const password = body.password;

    if (name.length < 1 || name.length > 80) {
      throw new ApiError("Name must be between 1 and 80 characters.", 400);
    }
    if (!usernamePattern.test(username)) {
      throw new ApiError(
        "Username must be 3–30 characters using letters, numbers, or underscores.",
        400,
      );
    }
    if (email.length > 254 || !emailPattern.test(email)) {
      throw new ApiError("Enter a valid email address.", 400);
    }
    if (password.length < 8 || password.length > 128) {
      throw new ApiError("Password must be between 8 and 128 characters.", 400);
    }

    await connectDB();
    const [existingEmail, existingUsername] = await Promise.all([
      User.exists({ email }),
      User.exists({ username }),
    ]);
    if (existingEmail) {
      throw new ApiError("An account already exists with that email.", 409);
    }
    if (existingUsername) {
      throw new ApiError("That username is already taken.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      username,
      email,
      passwordHash,
      usernameIsCustom: true,
    });

    return Response.json(
      {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      const keyPattern =
        "keyPattern" in error && typeof error.keyPattern === "object"
          ? error.keyPattern
          : undefined;
      const field =
        keyPattern && "username" in keyPattern
          ? "username"
          : keyPattern && "email" in keyPattern
            ? "email"
            : undefined;
      const message =
        field === "username"
          ? "That username is already taken."
          : field === "email"
            ? "An account already exists with that email."
            : "An account with those details already exists.";
      return Response.json({ error: message }, { status: 409 });
    }
    return routeError(error);
  }
}
