import { LibraryBig, Tags } from "lucide-react";
import { LibraryBrowser } from "@/components/library-browser";
import { referenceCategories, referenceEntries } from "@/lib/reference";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const category = params?.category ?? "all";

  return <main className="workspace-page library-page">
    <header className="workspace-header library-header">
      <div>
        <span className="eyebrow"><span /> BIBLIOTECA</span>
        <h1>Referencia C++ e Unreal</h1>
        <p>Macros, tipos, ciclo de vida, componentes e padroes usados nos desafios, organizados para consulta rapida.</p>
      </div>
      <div className="library-header-stats">
        <div className="panel"><LibraryBig size={17} /><strong>{referenceEntries.length}</strong><span>fichas</span></div>
        <div className="panel"><Tags size={17} /><strong>{referenceCategories.length}</strong><span>categorias</span></div>
      </div>
    </header>

    <LibraryBrowser entries={referenceEntries} categories={referenceCategories} initialQuery={query} initialCategory={category} />
  </main>;
}
