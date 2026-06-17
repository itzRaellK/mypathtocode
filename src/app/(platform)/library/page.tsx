import { BookOpenText, Code2, ExternalLink, Hash, LibraryBig, Search, Tags } from "lucide-react";
import { referenceCategories, referenceEntries } from "@/lib/reference";

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const query = params?.q?.trim() ?? "";
  const category = params?.category ?? "all";
  const normalizedQuery = normalize(query);

  const filteredEntries = referenceEntries.filter((entry) => {
    const matchesCategory = category === "all" || entry.category === category;
    const haystack = normalize([
      entry.title,
      entry.category,
      entry.summary,
      entry.syntax,
      entry.returns ?? "",
      entry.useWhen,
      entry.example,
      ...entry.pitfalls,
      ...entry.related,
    ].join(" "));
    return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
  });

  const featuredEntries = referenceEntries.filter((entry) => ["uproperty", "editanywhere", "fvector", "frotator", "beginplay", "tick", "ue-log", "spawnactor"].includes(entry.slug));

  return <main className="workspace-page library-page">
    <header className="workspace-header">
      <div>
        <span className="eyebrow"><span /> BIBLIOTECA</span>
        <h1>Referencia para consultar sem travar.</h1>
        <p>Um lugar para entender macros, tipos, funcoes, specifiers e padroes de C++ + Unreal com exemplos pequenos e diretos.</p>
      </div>
      <div className="workspace-stat panel"><LibraryBig size={18} /><span><strong>{referenceEntries.length}</strong><small>fichas iniciais</small></span></div>
    </header>

    <section className="library-intro-grid">
      <article className="panel library-principle">
        <BookOpenText size={20} />
        <span className="eyebrow">COMO USAR</span>
        <h2>Leia como dicionario, pratique como mapa.</h2>
        <p>Quando a Arena citar um recurso que voce nao conhece, procure aqui, veja a assinatura, entenda o que ele recebe, o que devolve e copie apenas o padrao mental para resolver o desafio.</p>
      </article>
      <article className="panel library-principle">
        <Code2 size={20} />
        <span className="eyebrow">ESCOPO</span>
        <h2>C++ + Unreal, do basico ao essencial.</h2>
        <p>A biblioteca comeca grande, mas foi feita para crescer. Novas APIs, macros e conceitos entram como fichas, sem precisar refazer banco ou tela.</p>
      </article>
    </section>

    <section className="library-featured">
      <div className="section-heading">
        <div><span className="eyebrow">ATALHOS</span><h2>Itens que aparecem bastante nos desafios</h2></div>
      </div>
      <div className="library-chip-grid">
        {featuredEntries.map((entry) => <a className="panel library-feature-chip" href={`#${entry.slug}`} key={entry.slug}>
          <Hash size={14} />
          <span>{entry.title}</span>
          <small>{entry.category}</small>
        </a>)}
      </div>
    </section>

    <section className="panel library-filter-panel">
      <form className="library-search" action="/library">
        <label>
          <Search size={16} />
          <input name="q" placeholder="Buscar por UPROPERTY, FVector, overlap, Tick..." defaultValue={query} />
        </label>
        {category !== "all" && <input type="hidden" name="category" value={category} />}
        <button className="button button-primary" type="submit">Buscar</button>
      </form>
      <div className="library-category-list">
        <a className={category === "all" ? "library-category-active" : ""} href="/library">Tudo</a>
        {referenceCategories.map((item) => {
          const href = query ? `/library?category=${encodeURIComponent(item)}&q=${encodeURIComponent(query)}` : `/library?category=${encodeURIComponent(item)}`;
          return <a className={category === item ? "library-category-active" : ""} href={href} key={item}>{item}</a>;
        })}
      </div>
    </section>

    <section className="library-results-header">
      <div><span className="eyebrow">REFERENCIAS</span><h2>{filteredEntries.length} fichas encontradas</h2></div>
      {(query || category !== "all") && <a className="text-button" href="/library">Limpar filtros <ExternalLink size={12} /></a>}
    </section>

    <section className="library-entry-grid">
      {filteredEntries.map((entry) => <article className="panel library-entry-card" id={entry.slug} key={entry.slug}>
        <header>
          <div>
            <span>{entry.category}</span>
            <h2>{entry.title}</h2>
          </div>
          <Tags size={18} />
        </header>
        <p>{entry.summary}</p>
        <div className="library-entry-block">
          <strong>Sintaxe</strong>
          <pre><code>{entry.syntax}</code></pre>
        </div>
        {entry.returns && <div className="library-entry-note"><strong>Retorna</strong><span>{entry.returns}</span></div>}
        <div className="library-entry-note"><strong>Quando usar</strong><span>{entry.useWhen}</span></div>
        <div className="library-entry-block">
          <strong>Exemplo curto</strong>
          <pre><code>{entry.example}</code></pre>
        </div>
        <div className="library-entry-two-col">
          <div>
            <strong>Cuidado com</strong>
            <ul>{entry.pitfalls.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <strong>Relacionados</strong>
            <div className="library-related">
              {entry.related.map((slug) => <a href={`#${slug}`} key={slug}>{slug}</a>)}
            </div>
          </div>
        </div>
      </article>)}
    </section>

    {filteredEntries.length === 0 && <div className="empty-state panel">
      <Search size={24} />
      <h3>Nada encontrado ainda</h3>
      <p>Tente buscar por outro nome, categoria ou conceito. A biblioteca foi feita para crescer com os termos que aparecerem nos seus desafios.</p>
      <a className="button button-secondary" href="/library">Ver biblioteca completa</a>
    </div>}
  </main>;
}
