import mongoose, { Schema, Types } from "mongoose";
import { DEFAULT_AVATAR } from "@/lib/default-avatar";

export interface IUser {
  username: string;
  name: string;
  email: string;
  passwordHash?: string;
  image: string;
  bio: string;
  usernameIsCustom: boolean;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  posts: Types.ObjectId[];
  likedPosts: Types.ObjectId[];
  commentedPosts: Types.ObjectId[];
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, select: false },
  usernameIsCustom: { type: Boolean, default: true },
  image: { type: String, default: DEFAULT_AVATAR, trim: true },
  bio: { type: String, default: "", trim: true },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
  posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  likedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
  commentedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
});

userSchema.index({ name: "text", username: "text" });

const User: mongoose.Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);

export default User;