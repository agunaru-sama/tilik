import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilik",
  description: "Validasi klaim dalam hitungan detik. Bukan opini, murni data.",
};

export const viewport: Viewport = { themeColor: "#02050b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="orbs" aria-hidden="true">
          <div className="orb orb-a" />
          <div className="orb orb-b" />
        </div>
        {children}
      <body>
        {children}
        <footer className="py-6 text-center text-sm opacity-70">
          © {new Date().getFullYear()} gennalbi. Hak cipta dilindungi.
        </footer>
      </body>
      </body>
    </html>
  );
}
