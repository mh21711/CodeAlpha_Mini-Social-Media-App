import mongoose, { Schema, Types } from "mongoose";

export interface IPost {
  title: string;
  description: string;
  imageUrl?: string;
  author: Types.ObjectId;
  likes: Types.ObjectId[];
  comments: Types.ObjectId[];
  impressions: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const postSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    impressions: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

postSchema.index({ title: "text", description: "text" });
postSchema.index({ createdAt: -1 });

const Post: mongoose.Model<IPost> =
  mongoose.models.Post ?? mongoose.model<IPost>("Post", postSchema);

export default Post;