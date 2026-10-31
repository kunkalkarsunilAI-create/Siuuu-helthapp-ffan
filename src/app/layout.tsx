import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CLERK_ON } from "@/lib/clerk";

export const metadata: Metadata = {
  title: "BulkBuddy — mass-gain dashboard for footballers",
  description: "Track your 66→75 kg bulk, 4 L hydration, macros from voice-style logs, plus a Fan Zone.",
};

export const viewport: Viewport = { themeColor: "#09090b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100 antialiased">
        {CLERK_ON ? (
          <ClerkProvider appearance={{ variables: { colorPrimary: "#65a30d" } }} signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
