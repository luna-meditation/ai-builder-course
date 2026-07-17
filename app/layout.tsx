import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AI BUILDER", template: "%s · AI BUILDER" },
  description: "Практический курс по созданию цифровых продуктов с ИИ",
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
