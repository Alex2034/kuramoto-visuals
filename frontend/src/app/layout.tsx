import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuramoto Vis",
  description: "Evolution of Kuramoto System on Dumbbell Graph",
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
