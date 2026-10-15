import { v2 as cloudinary } from "cloudinary";
import type { UploadApiErrorResponse } from "cloudinary";
import type {
  UploadApiOptions,
  UploadApiResponse,
} from "cloudinary";

export function getCloudinaryClient() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export async function uploadImage(
  source: string,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  if (!source.trim()) {
    throw new Error("An image source is required for Cloudinary upload.");
  }

  return getCloudinaryClient().uploader.upload(source, {
    ...options,
    resource_type: "image",
  });
}

export async function uploadImageBuffer(
  source: Buffer,
  options: UploadApiOptions = {},
): Promise<UploadApiResponse> {
  if (source.length === 0) {
    throw new Error("An image source is required for Cloudinary upload.");
  }

  const uploader = getCloudinaryClient().uploader;
  return new Promise((resolve, reject) => {
    const stream = uploader.upload_stream(
      { ...options, resource_type: "image" },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined,
      ) => {
        if (error) {
          reject(error);
        } else if (!result) {
          reject(new Error("Cloudinary did not return an upload result."));
        } else {
          resolve(result);
        }
      },
    );
    stream.on("error", reject);
    stream.end(source);
  });
}

export async function deleteCloudinaryImage(imageUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return;
  }

  if (url.hostname !== "res.cloudinary.com") return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is required to delete images.");
  }

  const path = url.pathname.split("/").filter(Boolean);
  if (path[0] !== cloudName) return;

  const uploadIndex = path.findIndex(
    (segment, index) => segment === "upload" && path[index - 1] === "image",
  );
  if (uploadIndex < 0) return;

  const publicIdSegments = path.slice(uploadIndex + 1);
  if (publicIdSegments[0]?.match(/^v\d+$/)) {
    publicIdSegments.shift();
  }

  const lastSegment = publicIdSegments.at(-1);
  if (!lastSegment) return;
  publicIdSegments[publicIdSegments.length - 1] = lastSegment.replace(
    /\.[^.]+$/,
    "",
  );
  const publicId = publicIdSegments.map(decodeURIComponent).join("/");
  if (!publicId) return;

  const result = await getCloudinaryClient().uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary image deletion failed: ${result.result}.`);
  }
}
