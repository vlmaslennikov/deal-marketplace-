import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Deal | Marketplace prototype",
  description:
    "Discover financial businesses and connect with acquisition partners.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
