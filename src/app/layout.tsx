import type { Metadata, Viewport } from "next";
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
    "Hey, there! I am Numbered Dev, a software engineer, designer and app experience developer.",
  applicationName: "Numbered Dev",
  keywords: [
    "software engineer",
    "developer portfolio",
    "engineering blog",
    "ai",
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
    title: "Numbered Dev",
    description: "Hey, there! I am Numbered Dev, a software engineer, designer and app experience developer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Numbered Dev",
    description: "Hey, there! I am Numbered Dev, a software engineer, designer and app experience developer.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#5b9fd6",
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
