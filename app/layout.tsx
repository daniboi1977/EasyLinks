import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "./components/RegisterSW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookmarks",
  description: "Personal bookmark manager with AI tagging",
};

// Tells the browser this page manages its own light/dark styling, so
// Android Chrome's "force dark" doesn't override light mode with a
// washed-out grey.
export const viewport: Viewport = {
  colorScheme: "light dark",
};

// Runs before paint so the correct theme class is set immediately (no flash
// of the wrong theme while React hydrates). Defaults to dark to match the
// app's original always-dark look for anyone who hasn't chosen yet.
const themeInitScript = `
  (function () {
    try {
      var theme = localStorage.getItem('theme');
      if (theme !== 'light' && theme !== 'dark') theme = 'dark';
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
