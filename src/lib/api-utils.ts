import { Types, type HydratedDocument } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User, { type IUser } from "@/models/User";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function getImageFile(
  formData: FormData,
  field = "image",
): File | undefined {
  const value = formData.get(field);
  if (value === null) return undefined;
  if (!(value instanceof File)) {
    throw new ApiError(`${field} must be an image file.`, 400);
  }
  if (!allowedImageTypes.has(value.type)) {
    throw new ApiError("Choose a JPEG, PNG, WebP, or GIF image.", 400);
  }
  if (value.size === 0) {
    throw new ApiError("The selected image is empty.", 400);
  }
  if (value.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ApiError("Images must be 3 MB or smaller.", 413);
  }
  return value;
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError("Request body must be a JSON object.", 400);
  }

  return body as Record<string, unknown>;
}

export function routeError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("[api] Unhandled route error:", error);
  return Response.json({ error: "Internal server error." }, { status: 500 });
}

export async function getAuthenticatedUser(
  options: { allowIncompleteUsername?: boolean } = {},
): Promise<HydratedDocument<IUser>> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new ApiError("Sign in to continue.", 401);
  }

  await connectDB();
  const user = await User.findById(session.user.id);

  if (!user) {
    throw new ApiError("Your user profile could not be found.", 401);
  }

  if (!options.allowIncompleteUsername && !user.usernameIsCustom) {
    throw new ApiError("Choose a unique username to continue.", 409);
  }

  return user;
}

export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value) && Types.ObjectId.isValid(value);
}

export function parsePositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number {
  if (value === null) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError("Pagination values must be positive integers.", 400);
  }

  return Math.min(parsed, maximum);
}

export function getString(
  value: unknown,
  field: string,
  options: { required?: boolean; maxLength?: number } = {},
): string | undefined {
  if (value === undefined && !options.required) return undefined;
  if (typeof value !== "string") {
    throw new ApiError(`${field} must be a string.`, 400);
  }

  const result = value.trim();
  if (options.required && result.length === 0) {
    throw new ApiError(`${field} is required.`, 400);
  }
  if (options.maxLength && result.length > options.maxLength) {
    throw new ApiError(`${field} must be ${options.maxLength} characters or fewer.`, 400);
  }

  return result;
}

export function validateImageUrl(value: string | undefined): string | undefined {
  if (value === undefined || value === "") return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError("imageUrl must be a valid URL.", 400);
  }

  if (url.protocol !== "https:") {
    throw new ApiError("imageUrl must use HTTPS.", 400);
  }

  return url.toString();
}
