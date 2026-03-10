# Numbered Dev

A sleek developer portfolio and blog built with React, Next.js, Markdown content, and SQLite-backed admin auth.

## Stack

- React
- Next.js App Router
- TypeScript
- Tailwind CSS
- Markdown articles with frontmatter
- SQLite via `better-sqlite3`
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
- SQLite-backed admin sessions
- Hashed admin password storage
- Draft and published post support
- Flat, modern developer-focused UI

## Project Structure

```text
blog/
├── content/
│   └── posts/              # Markdown blog posts
├── data/
│   └── site.db             # SQLite database created at runtime
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
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-immediately
```

### Notes

- If these values are not provided, the app falls back to:
  - username: `admin`
  - password: `changeme-now`
- You should override those defaults before using the site seriously.
- On first run, the admin user is seeded into SQLite automatically.

## Admin Access

Open:

```text
http://localhost:3000/admin
```

Sign in with the credentials from `.env.local`.

The admin area is intentionally simple and lets you:

- create posts
- edit posts
- delete posts
- mark articles as published or draft
- manage Markdown content in a built-in editor

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

SQLite is used for lightweight local persistence.

Current usage includes:

- admin accounts
- admin sessions

The database file is created automatically at runtime:

```text
data/site.db
```

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

## Production Notes

Before deploying:

1. Set `ADMIN_USERNAME`
2. Set a strong `ADMIN_PASSWORD`
3. Protect access to the deployed admin route
4. Make sure the runtime can write to:
   - `data/`
   - `content/posts/`

## Why This Setup

This project is optimized for a solo developer workflow:

- Markdown keeps writing portable and versionable
- SQLite keeps admin storage simple
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
