import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ai-builder-course.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "AI BUILDER", template: "%s · AI BUILDER" },
  description: "Практический курс по созданию цифровых продуктов с ИИ",
  applicationName: "AI Builder Course",
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: appUrl,
    siteName: "AI Builder Course",
    title: "AI Builder Course",
    description: "Создай свой первый IT-продукт с помощью ИИ.",
    images: [{ url: "/brand/ai-builder-logo.png", width: 1024, height: 1024, alt: "AI Builder Course" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Builder Course",
    description: "Создай свой первый IT-продукт с помощью ИИ.",
    images: ["/brand/ai-builder-logo.png"],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#090a0e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" data-scroll-behavior="smooth" suppressHydrationWarning>
    <head>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
    </head>
    <body>
      {children}
      <Toaster theme="dark" richColors position="top-center" toastOptions={{ style: { background: "#171a22", border: "1px solid rgba(255,255,255,.1)" } }} />
    </body>
  </html>;
}
