import mongoose, { Schema, Types } from "mongoose";

export interface IComment {
  author: Types.ObjectId;
  post: Types.ObjectId;
  text: string;
  parentCommentId?: Types.ObjectId;
  likes: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    text: { type: String, required: true, trim: true },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: undefined,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 });

const Comment: mongoose.Model<IComment> =
  mongoose.models.Comment ?? mongoose.model<IComment>("Comment", commentSchema);

export default Comment;