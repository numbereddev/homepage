import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PageTransition } from "@/components/animations";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://numbered.dev"),
  title: {
    default: "Numbered Dev",
    template: "%s · Numbered Dev",
  },
  description:
    "Numbered Dev is a sharp, modern developer blog and portfolio focused on software engineering, product thinking, and technical writing.",
  applicationName: "Numbered Dev",
  keywords: [
    "Numbered Dev",
    "software engineer",
    "developer portfolio",
    "engineering blog",
    "React",
    "Next.js",
    "technical writing",
    "web development",
  ],
  authors: [{ name: "Numbered Dev" }],
  creator: "Numbered Dev",
  publisher: "Numbered Dev",
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://numbered.dev",
    siteName: "Numbered Dev",
    title: "Numbered Dev",
    description: "A dark, flat, technical portfolio and blog for modern software engineering.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Numbered Dev",
    description: "A sharp developer portfolio and engineering blog built for modern software work.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-neutral-950 text-neutral-100 antialiased`}
      >
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
