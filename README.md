# Numbered Dev

A sleek developer portfolio and blog built with React, Next.js, Markdown content, and a MySQL-backed admin/auth system that works well on Node.js hosting such as Plesk.

## Stack

- React
- Next.js App Router
- TypeScript
- Tailwind CSS
- Markdown articles with frontmatter
- MySQL
- Hashed passwords with `bcryptjs`

## Design Goals

Numbered Dev is intentionally designed to feel:

- dark
- sharp
- flat
- modern
- technical

That means:

- sharp corners
- minimal visual effects
- no fluffy glow
- no soft card-heavy styling
- clean borders
- strong typography
- restrained accent color

## Features

- Portfolio-style landing page
- Blog powered by Markdown files in `content/posts`
- Individual article pages
- Lightweight admin panel
- MySQL-backed admin accounts, sessions, links, assets, post views, and reactions
- Hashed admin password storage
- Draft and published post support
- Flat, modern developer-focused UI

## Project Structure

```text
blog/
├── content/
│   └── posts/              # Markdown blog posts
├── public/                 # Static assets
└── src/
    ├── app/                # Next.js routes and API handlers
    ├── components/         # UI components
    └── lib/                # Content and database helpers
```

## Getting Started

Install dependencies:

```bash
npm install
```

### Optional: run MySQL locally with Docker

Use the included Compose file instead of a custom MySQL Dockerfile:

```bash
docker compose up -d
docker compose logs -f mysql
```

If you previously started the container with an older broken config, remove the old container and volume first:

```bash
docker compose down -v
docker compose up -d
```

The local MySQL container uses these defaults:

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=numbered_dev
MYSQL_USER=numbered_dev_user
MYSQL_PASSWORD=change-this
```

The included Compose setup is based on `mysql:8.4` and does not require the deprecated `default-authentication-plugin=mysql_native_password` option.

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

Create a `.env.local` file in the project root.

Example:

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=numbered_dev
MYSQL_USER=numbered_dev_user
MYSQL_PASSWORD=change-this
SESSION_COOKIE_NAME=numbered-dev-admin-session
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-immediately
```

### Optional app URL settings

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Notes

- The app uses MySQL for runtime persistence.
- The database schema is created automatically when the app starts and connects successfully.
- The initial admin user is created automatically from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if that user does not already exist.
- If the configured admin already exists, the app leaves it unchanged.
- You should use a strong MySQL password and a strong admin password in production.

## Admin Access

Open:

```text
http://localhost:3000/admin
```

Sign in with the credentials from your environment variables.

The admin area lets you:

- create posts
- edit posts
- delete posts
- manage projects
- manage links
- upload and manage assets

## How Posts Work

Posts are stored as Markdown files under:

```text
content/posts
```

Each post uses frontmatter like this:

```md
---
title: "My Post Title"
excerpt: "Short summary for cards and previews."
date: "2026-03-09"
published: true
tags:
  - react
  - architecture
cover: "/optional-image.svg"
---

# Heading

Write your article here.
```

## Content Workflow

You can manage content in two ways:

### 1. Through the admin page

Use the admin panel to create and update posts without editing files manually.

### 2. Directly in Markdown

Edit files in `content/posts` if you prefer a file-based workflow.

## Database

MySQL is used for application persistence.

Current usage includes:

- admin accounts
- admin sessions
- social/profile links
- uploaded asset metadata
- post views
- post reactions

The schema is created automatically by the application at runtime when the database connection is available.

If you use the local Docker MySQL setup above, make sure the container is running before starting the app. If MySQL fails to start because of an old data directory or an invalid server option from an earlier config, run:

```bash
docker compose down -v
docker compose up -d
```

This removes the old local MySQL volume and recreates the database cleanly.

## Authentication

Admin authentication uses:

- hashed passwords
- session tokens
- expiring admin sessions

This keeps the setup lightweight while still covering the basics expected from a private admin surface.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deploying on Plesk Node.js Hosting

A typical Plesk deployment looks like this:

1. Create a Node.js app in Plesk
2. Create a MySQL database in Plesk
3. Add the required environment variables in Plesk
4. Install dependencies
5. Build the app
6. Start or restart the app
7. Open `/admin` and sign in with the admin credentials from the environment

### Important deployment notes

Make sure the runtime can write to:

- `content/posts/`
- `public/assets/`

If your hosting setup restricts filesystem writes, admin content creation and uploads will not work until those directories are writable.

### Recommended production configuration

- Set `NODE_ENV=production`
- Use HTTPS
- Use a strong MySQL password
- Use a strong admin password
- Restrict access to the admin area where possible
- Back up both the MySQL database and your Markdown/content files

## Why This Setup

This project is optimized for a solo developer workflow:

- Markdown keeps writing portable and versionable
- MySQL fits shared hosting and Plesk environments better than SQLite
- Next.js keeps the public site and admin in one codebase
- The UI stays focused on clean presentation instead of decorative effects

## Default Intent

Numbered Dev is meant to feel like software built by an engineer:

- precise
- structured
- readable
- modern
- useful

No weird shadows. No glowing noise. Just a clean, sharp, dark system.

## License

Private project unless you choose otherwise.
