import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setlistics",
  description: "Most-played songs and tour stats for any artist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}