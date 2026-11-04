import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PwaSetup } from "@/components/ui/PwaSetup";
import { AuthProvider } from "@/context/AuthContext";
import { SharedProvider } from "@/context/SharedContext";
import { VaultProvider } from "@/context/VaultContext";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "VaultSpark: zero-knowledge password manager", template: "%s · VaultSpark" },
  description:
    "Check password strength in real time, generate strong passwords, and store credentials in an end-to-end encrypted vault.",
  applicationName: "VaultSpark",
  appleWebApp: { capable: true, title: "VaultSpark", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#05080d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="aurora" aria-hidden />
        <AuthProvider>
          <VaultProvider>
            <SharedProvider>{children}</SharedProvider>
          </VaultProvider>
        </AuthProvider>
        <PwaSetup />
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{ style: { background: "rgb(15 20 28 / 0.95)", border: "1px solid rgb(255 255 255 / 0.1)", color: "#e6edf3" } }}
        />
      </body>
    </html>
  );
}
