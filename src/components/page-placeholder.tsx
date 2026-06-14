import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

export function PagePlaceholder({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <main className="placeholder-page">
      <section className="placeholder-card panel">
        <span className="placeholder-icon"><Construction size={26} /></span>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="button button-ghost" href="/dashboard"><ArrowLeft size={15} /> Voltar à central</Link>
      </section>
    </main>
  );
}
