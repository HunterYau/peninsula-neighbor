import type { Metadata } from "next";
import "./globals.css";
import "./layout.css";
import "./redesign.css";
import "./civic.css";

export const metadata: Metadata = {
  title: "Peninsula Neighbor — Your community, connected",
  description: "The everyday community platform for Palos Verdes Estates and the Peninsula. Local services, neighbor-to-neighbor help, events, places, and practical tools in one place.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
