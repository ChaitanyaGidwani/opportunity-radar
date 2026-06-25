import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Characterful display face for headings — real type contrast against Geist body.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const notoDeva = Noto_Sans_Devanagari({
  variable: "--font-noto",
  subsets: ["devanagari"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Argus — lock onto your goals",
    template: "%s · Argus",
  },
  description:
    "Argus aggregates internships, scholarships, competitions and hackathons from live sources into one personalised feed, filters them to your profile, and nudges you before every deadline.",
  applicationName: "Argus",
  keywords: ["internships", "scholarships", "hackathons", "competitions", "students", "India", "deadline reminders"],
};

export const viewport: Viewport = {
  themeColor: "#f5f6f8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} ${notoDeva.variable} h-full antialiased`}
    >
      <head>
        {/* Locked to the light theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme','light');`,
          }}
        />
      </head>
      <body className="min-h-full bg-base text-ink font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
