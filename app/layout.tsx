import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Botola Secure Analytics — Season Command Center",
  description: "Moroccan football intelligence and performance analytics dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
