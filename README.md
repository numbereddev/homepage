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
- First-run setup flow for creating the initial admin account

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
MYSQL_SSL=false
SESSION_COOKIE_NAME=numbered-dev-admin-session
```

### Optional app URL settings

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Notes

- The app uses MySQL for runtime persistence.
- On first run, if no admin account exists yet, `/admin` shows an initial setup screen instead of the login form.
- The first setup creates the initial admin user in the database.
- After setup is complete, the normal admin login flow is used.
- You should use a strong MySQL password and a strong admin password in production.

## Initial Setup Flow

When the site is connected to MySQL but has not been configured yet:

1. Open `/admin`
2. You will see the first-run setup screen
3. Create the initial admin username and password
4. Sign in and use the dashboard normally

This is useful for deployments on hosting panels like Plesk where you provision the MySQL database first and complete app setup in the browser.

## Admin Access

Open:

```text
http://localhost:3000/admin
```

Behavior:

- If the app is not set up yet, you will see the setup screen
- If setup is complete, you will see the admin login screen
- After login, you can manage posts, projects, links, and assets

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
6. Start/restart the app
7. Open `/admin` and complete the initial setup if no admin exists yet

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
