import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "../context/WalletProvider";
import { AuthProvider } from "../context/AuthProvider";
import { ToastProvider } from "../context/ToastProvider";
import { StellarNetworkBadge } from "../components/ui/network-badge";
import { getStellarConfig } from "../lib/stellar-config";

const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/satoshi/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi/Satoshi-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/satoshi/Satoshi-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "Artisyn - The Future of Work",
  description: "Connect your wallet and join the decentralized ecosystem",
};

// Fail fast: an unsupported or inconsistent Stellar configuration throws during
// render/build instead of silently shipping a mismatched network (issue #204).
getStellarConfig();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${satoshi.variable} antialiased`}>
        <ToastProvider>
          <WalletProvider>
            <AuthProvider>{children}</AuthProvider>
            {/* Non-production only; renders null in production builds. */}
            <StellarNetworkBadge className="fixed bottom-4 right-4 z-50" />
          </WalletProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
