This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

Add the following values to `.env.local` before connecting the application to its services:

```env
MONGODB_URI=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_CLOUD_NAME=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
```

Use `connectDB` from `src/lib/mongodb.ts` to connect to MongoDB. Use `getCloudinaryClient` or `uploadImage` from `src/lib/cloudinary.ts` for server-side Cloudinary access. Google OAuth credentials are required for Google sign-in; configure the Google OAuth redirect URI as `http://localhost:3000/api/auth/callback/google` for local development. Set `NEXTAUTH_SECRET` to a random secret for signed sessions.

## API

All API routes are under `/api`. Google and email/password sign-in use NextAuth at `/api/auth/*`. Manual registration is available at `POST /api/auth/register`; passwords are hashed before storage. New Google accounts must choose an available username with `PATCH /api/users/me` before creating posts, commenting, liking, or following.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/users/me` | `GET`, `PATCH` | Current profile; complete username setup or update profile |
| `/api/users/username?username=...` | `GET` | Check username availability |
| `/api/users/[username]` | `GET` | Public user profile and post collections |
| `/api/users/[username]/follow` | `POST` | Toggle follow status |
| `/api/search?q=...` | `GET` | Search users and posts |
| `/api/posts` | `GET`, `POST` | Ranked, paginated feed; create a post |
| `/api/posts/[postId]` | `GET`, `PATCH`, `DELETE` | Read or manage a post |
| `/api/posts/[postId]/like` | `POST` | Toggle a like |
| `/api/posts/[postId]/comments` | `GET`, `POST` | List or add threaded comments |
| `/api/comments/[commentId]` | `PATCH`, `DELETE` | Edit or delete a comment and its replies |

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
