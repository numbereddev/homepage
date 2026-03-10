import { cookies } from "next/headers";
import AdminDashboard from "@/components/admin-dashboard";
import { getAllPosts, getAllProjects } from "@/lib/content";
import {
  clearExpiredAdminSessions,
  getAdminSession,
  getAllLinks,
  getAllAssets,
  isInitialSetupComplete,
} from "@/lib/db";

type AdminPageData =
  | {
      isSetupComplete: false;
      session: null;
    }
  | {
      isSetupComplete: true;
      session: null | {
        username: string;
      };
    };

async function getAdminData(): Promise<AdminPageData> {
  const isSetupComplete = await isInitialSetupComplete();

  if (!isSetupComplete) {
    return {
      isSetupComplete: false,
      session: null,
    };
  }

  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get("numbered-dev-admin-session")?.value;

  if (!token) {
    return {
      isSetupComplete: true,
      session: null,
    };
  }

  const session = await getAdminSession(token);

  if (!session) {
    return {
      isSetupComplete: true,
      session: null,
    };
  }

  return {
    isSetupComplete: true,
    session: {
      username: session.username,
    },
  };
}

function AdminSetup() {
  return (
    <div className="min-h-screen bg-[#0a0d12] text-[#f5f7fa]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 py-10 sm:px-8">
        <div className="grid w-full max-w-6xl gap-px border border-[#202632] bg-[#202632] lg:grid-cols-[1.15fr_0.85fr]">
          <section className="bg-[#0f141b] p-8 sm:p-10">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7d8a99]">
                Numbered Dev
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                Initial setup required before admin access.
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[#9fb0bf] sm:text-base">
                This installation has not been configured yet. Complete the first-run setup to
                create your admin account and connect the site to your production database.
              </p>

              <div className="mt-10 grid gap-px border border-[#202632] bg-[#202632] sm:grid-cols-3">
                {[
                  ["Admin Account", "Create the first administrator for the dashboard."],
                  ["MySQL Ready", "Use database credentials provided by your hosting panel."],
                  ["Safe First Run", "Lock setup once the site has been initialized."],
                ].map(([title, detail]) => (
                  <div key={title} className="bg-[#0b0f14] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8a99]">
                      {title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#c7d0db]">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 border border-[#202632] bg-[#0b0f14] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8a99]">
                  Hosting Notes
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-[#c7d0db]">
                  <li>
                    • Add your MySQL connection values to the environment variables in your hosting
                    panel.
                  </li>
                  <li>
                    • Make sure the Node.js app has the correct application root and startup
                    command.
                  </li>
                  <li>• Run this setup screen only once on a fresh installation.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-[#0a0d12] p-8 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="border border-[#202632] bg-[#0b0f14] p-6 sm:p-8">
                <div className="mb-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                    First-Time Setup
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Create the initial admin user
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#8fa1b3]">
                    Submit your first administrator credentials to finish the installation and
                    unlock the dashboard.
                  </p>
                </div>

                <form action="/api/admin/setup" method="POST" className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99]">
                      Username
                    </span>
                    <input
                      name="username"
                      type="text"
                      autoComplete="username"
                      minLength={3}
                      maxLength={64}
                      required
                      className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#f5f7fa]"
                      placeholder="admin"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99]">
                      Password
                    </span>
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      required
                      className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#f5f7fa]"
                      placeholder="Use a strong password"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99]">
                      Confirm Password
                    </span>
                    <input
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={10}
                      required
                      className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#f5f7fa]"
                      placeholder="Repeat the password"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full border border-[#3a4758] bg-[#f5f7fa] px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#0a0d12] transition hover:bg-[#dfe6ee]"
                  >
                    Complete Setup
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AdminLogin() {
  return (
    <div className="min-h-screen bg-[#0a0d12] text-[#f5f7fa]">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 py-10 sm:px-8">
        <div className="grid w-full max-w-5xl gap-px border border-[#202632] bg-[#202632] lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-[#0f141b] p-8 sm:p-10">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7d8a99]">
                Numbered Dev
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                Admin access for writing and publishing.
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-7 text-[#9fb0bf] sm:text-base">
                This admin surface is intentionally small: authenticate, manage markdown posts, and
                keep the public site sharp, dark, and fast.
              </p>

              <div className="mt-10 grid gap-px border border-[#202632] bg-[#202632] sm:grid-cols-3">
                {[
                  ["Markdown", "Write articles as files with clean frontmatter."],
                  ["MySQL", "Persistent auth and session storage for hosted deployments."],
                  ["Flat UI", "Sharp corners, hard borders, and zero visual noise."],
                ].map(([title, detail]) => (
                  <div key={title} className="bg-[#0b0f14] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7d8a99]">
                      {title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#c7d0db]">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#0a0d12] p-8 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="border border-[#202632] bg-[#0b0f14] p-6 sm:p-8">
                <div className="mb-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                    Secure Login
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Sign in to the dashboard
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#8fa1b3]">
                    Use the admin credentials created during the initial setup.
                  </p>
                </div>

                <form action="/api/admin/login" method="POST" className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99]">
                      Username
                    </span>
                    <input
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#f5f7fa]"
                      placeholder="admin"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99]">
                      Password
                    </span>
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full border border-[#202632] bg-[#0f141b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#f5f7fa]"
                      placeholder="••••••••••••"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full border border-[#3a4758] bg-[#f5f7fa] px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#0a0d12] transition hover:bg-[#dfe6ee]"
                  >
                    Enter Admin
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const adminData = await getAdminData();

  if (!adminData.isSetupComplete) {
    return <AdminSetup />;
  }

  if (!adminData.session) {
    return <AdminLogin />;
  }

  const posts = getAllPosts(true);
  const projects = getAllProjects(true);
  const links = await getAllLinks();
  const assets = await getAllAssets();

  function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return "";
    return filename.slice(lastDot);
  }

  return (
    <AdminDashboard
      initialPosts={posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        createdAt: post.createdAt,
        published: post.published,
        tags: post.tags,
        cover: post.cover,
        readingTime: post.readingTime,
      }))}
      initialProjects={projects.map((proj) => ({
        slug: proj.slug,
        title: proj.title,
        excerpt: proj.excerpt,
        createdAt: proj.createdAt,
        published: proj.published,
        pinned: proj.pinned,
        tags: proj.tags,
        cover: proj.cover,
        gallery: proj.gallery,
        isOpenSource: proj.isOpenSource,
        sourceUrl: proj.sourceUrl,
      }))}
      adminUsername={adminData.session.username}
      initialLinks={links.map((l) => ({
        id: l.id,
        label: l.label,
        url: l.url,
        display_order: l.display_order,
      }))}
      initialAssets={assets.map((a) => ({
        id: a.id,
        slug: a.slug,
        filename: a.filename,
        mimeType: a.mime_type,
        size: a.size,
        createdAt: a.created_at,
        url: `/assets/${a.slug}${getFileExtension(a.filename)}`,
      }))}
    />
  );
}
