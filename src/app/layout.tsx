import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "My Path to Code",
  description: "Plataforma avançada de domínio técnico.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-accent="green">
      <body>{children}</body>
    </html>
  );
}
