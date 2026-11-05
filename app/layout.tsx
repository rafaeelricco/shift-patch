import "@/app/globals.css"

import { type Metadata, type Viewport } from "next"

const siteName = "ShiftPatch"
const title = "ShiftPatch | Real-time nursing shift coverage"
const description =
  "Post open nursing shifts, let credentialed nurses claim them, and see which shifts are covered in real time."

export const metadata: Metadata = {
  metadataBase: new URL("https://shift-patch.vercel.app/"),
  applicationName: siteName,
  title: {
    default: title,
    template: `%s | ${siteName}`,
  },
  description,
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  appleWebApp: {
    title: siteName,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title,
    description,
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: `${siteName} logo` }],
  },
  twitter: {
    card: "summary_large_image",
  },
}

export const viewport: Viewport = {
  colorScheme: "only light",
  themeColor: "#fcfcfc",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
