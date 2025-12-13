import "./globals.css";

export const metadata = {
  title: "Usluge",
  description: "Oglasi: nudim / tražim usluge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
