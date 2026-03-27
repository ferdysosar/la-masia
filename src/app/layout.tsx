import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Masia",
  description: "Web oficial del grupo de futbol La Masia",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
