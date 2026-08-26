import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Botola Secure Analytics v2",
  description: "Moroccan football intelligence and security analytics foundation",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
