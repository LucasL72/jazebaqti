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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin security setup

The admin area is protected by database-backed sessions, short-lived cookies, and mandatory 2FA (TOTP). Configure the following environment variables before running migrations or `npm run seed`:

- `ADMIN_EMAIL`: admin login email (stored in lowercase).
- `ADMIN_PASSWORD`: strong password (12+ chars, upper/lower case, digit, special).
- `ADMIN_TOTP_SECRET`: hex-encoded 2FA secret (generate with `openssl rand -hex 20`).
- `ADMIN_SESSION_MAX_AGE_SECONDS` (optional): session lifetime (default 1800s).
- `ADMIN_PASSWORD_MAX_AGE_DAYS` (optional): password rotation window (default 90 days).
- `MEDIA_SIGNING_SECRET` (recommended): HMAC secret used to sign private media URLs. Falls back to admin secrets in development.

Media uploads are validated server-side: images must be WebP/PNG/JPEG, audio must be a known audio format, and payloads larger than 40MB (audio) or 10MB (images) are rejected. The API checks the magic bytes to catch disguised executables and refuses uploads whose detected MIME type does not match the declared type. Files are written under `private_media/audio|images/albums` with a slugified name + UUID (e.g. `audio/albums/42/track-my-song-<uuid>.mp3`) and are only served through signed URLs via `/api/media?key=...&sig=...`. The path is normalized to stay inside the whitelisted directories before any write or delete.

## Audit & alerting

- Sensitive actions (album CRUD, media upload, role changes, admin login attempts) are stored in `audit_logs` with timestamp and actor.
- Admin dashboard available at `/admin/audit` to review the latest entries and adjust roles.
- Set `SLACK_WEBHOOK_URL` to receive Slack alerts for mass album deletions or repeated login failures.
- Set both `AUDIT_EMAIL_WEBHOOK_URL` and `AUDIT_ALERT_EMAILS` to forward the same alerts by email via your webhook provider.

Running the seed will upsert the admin user with the hashed password, TOTP secret, and enforce the password policy. Session cookies are `httpOnly`, `secure`, and `sameSite="lax"`, and sessions are invalidated server-side when expired or revoked.
