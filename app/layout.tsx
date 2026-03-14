import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Navbar } from "@/components/navbar";
import { ToastProvider } from "@/components/ui/toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "MediFind",
  description: "Find medicine nearby instantly"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} min-h-screen bg-slate-50 font-sans text-slate-900 antialiased`}
      >
        <ToastProvider>
          <Navbar />
          {children}
        </ToastProvider>
        <div id="modal-root" aria-hidden="true" />
      </body>
    </html>
  );
}
