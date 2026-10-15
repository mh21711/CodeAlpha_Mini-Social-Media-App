import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

function createTemporaryUsername(email: string) {
  const localPart = email.split("@")[0] ?? "user";
  const base = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  return `${base || "user"}-${randomUUID().slice(0, 8)}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        await connectDB();
        const user = await User.findOne({
          email: credentials.email.trim().toLowerCase(),
        }).select("+passwordHash");

        if (!user?.passwordHash) return null;

        const passwordMatches = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, trigger }) {
      if (token.userId && trigger !== "update") {
        return token;
      }
      if (!token.email) {
        return token;
      }

      await connectDB();
      const user = await User.findOne({ email: token.email }).select(
        "_id username usernameIsCustom name image",
      );
      if (!user) {
        throw new Error("The authenticated user record could not be found.");
      }

      token.userId = user.id;
      token.username = user.username;
      token.usernameIsCustom = user.usernameIsCustom;
      token.name = user.name;
      token.picture = user.image;
      return token;
    },
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }
      if (account?.provider !== "google" || !user.email) {
        return false;
      }

      await connectDB();
      const email = user.email.toLowerCase();
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        const updates: { name?: string; image?: string } = {};
        if (user.name) updates.name = user.name;
        if (user.image) updates.image = user.image;
        if (Object.keys(updates).length > 0) {
          await User.updateOne({ _id: existingUser._id }, { $set: updates });
        }
        return true;
      }

      try {
        await User.create({
          username: createTemporaryUsername(email),
          usernameIsCustom: false,
          name: user.name?.trim() || email.split("@")[0],
          email,
          image: user.image ?? undefined,
        });
      } catch (error) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== 11000
        ) {
          throw error;
        }

        if (!(await User.exists({ email }))) {
          throw error;
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (!token.userId || !token.username) {
        return session;
      }

      session.user.id = token.userId;
      session.user.username = token.username;
      session.user.usernameIsCustom = token.usernameIsCustom ?? false;
      session.user.name = token.name ?? null;
      session.user.image = token.picture ?? null;
      return session;
    },
  },
};
