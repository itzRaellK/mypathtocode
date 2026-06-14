import { ArrowRight, BookOpen, Code2, Flame, Layers3, Play, Sparkles, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";

type DashboardProps = {
  displayName: string;
  stats: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    lessonsPassed: number;
    exercisesPassed: number;
  };
  catalog: { tracks: number; lessons: number };
  nextLesson: { href: string; title: string; summary: string | null; moduleTitle: string; trackTitle: string } | null;
};

export function Dashboard({ displayName, stats, catalog, nextLesson }: DashboardProps) {
  const firstName = displayName.split(" ")[0];
  const metrics = [
    { label: "XP por domínio", value: String(stats.totalXp), detail: `Nível ${stats.level} · 100 por vitória`, icon: Zap },
    { label: "Aulas dominadas", value: String(stats.lessonsPassed), detail: `${catalog.lessons} planejadas`, icon: Target },
    { label: "Soluções aprovadas", value: String(stats.exercisesPassed), detail: "Aulas e Arena com nota mínima 9,0", icon: BookOpen },
    { label: "Sequência", value: `${stats.currentStreak} dias`, detail: `${stats.activeDays} dias ativos · recorde ${stats.longestStreak}`, icon: Flame },
  ];

  return (
    <main className="dashboard">
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow"><span /> CENTRAL DE EVOLUÇÃO</span>
          <h1>Continue construindo,<br /><em>{firstName}.</em></h1>
          <p>{nextLesson ? "Sua próxima aula está disponível. Estude, pratique e prove domínio real." : "Você ainda não possui uma aula planejada. Gere sua primeira trilha para começar."}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href={nextLesson ? nextLesson.href : "/tracks"}>
              {nextLesson ? <><Play size={16} fill="currentColor" /> Abrir próxima aula</> : <><Sparkles size={16} /> Gerar primeira trilha</>}
            </Link>
            <Link className="button button-ghost" href="/tracks">Ver catálogo <ArrowRight size={16} /></Link>
          </div>
        </div>
        <div className="command-orbit panel">
          <div className="orbit-glow" /><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" />
          <div className="orbit-core"><span>NÍVEL</span><strong>{String(stats.level).padStart(2, "0")}</strong><small>{stats.totalXp} XP acumulado</small></div>
          <div className="orbit-label orbit-label-one"><Code2 size={14} /> CÓDIGO</div>
          <div className="orbit-label orbit-label-two"><Layers3 size={14} /> {catalog.tracks} TRILHAS</div>
          <div className="orbit-label orbit-label-three"><Trophy size={14} /> {stats.lessonsPassed}</div>
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map(({ label, value, detail, icon: Icon }) => <article className="metric-card panel" key={label}><span className="metric-icon"><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="content-grid">
        <div className="main-column">
          <div className="section-heading"><div><span className="eyebrow">PRÓXIMO PASSO</span><h2>{nextLesson?.trackTitle ?? "Catálogo em construção"}</h2></div></div>
          {nextLesson ? (
            <article className="active-lesson panel">
              <div className="lesson-topline"><span className="lesson-number">AULA DISPONÍVEL</span><span className="difficulty"><span /> PLANEJADA</span></div>
              <div className="lesson-body"><div><span className="lesson-module">{nextLesson.moduleTitle}</span><h3>{nextLesson.title}</h3><p>{nextLesson.summary}</p></div><div className="lesson-score"><span>NOTA EXIGIDA</span><strong>9,0</strong><small>para liberar a progressão</small></div></div>
              <div className="lesson-footer"><span><Sparkles size={15} /> Conteúdo gerado sob demanda</span><Link href={nextLesson.href}>Abrir aula <ArrowRight size={16} /></Link></div>
            </article>
          ) : (
            <div className="empty-state panel"><Layers3 size={24} /><h3>Gere sua primeira trilha</h3><p>A IA montará o mapa curricular e o dashboard recomendará a primeira aula.</p><Link className="button button-ghost" href="/tracks">Escolher trilha</Link></div>
          )}
        </div>
        <aside className="side-column">
          <article className="panel weekly-card"><div className="section-heading compact"><div><span className="eyebrow">RITMO ATUAL</span><h3>{stats.currentStreak} dias</h3></div><Flame size={22} /></div><p>Seu maior ciclo registrado é de <strong>{stats.longestStreak} dias</strong>.</p></article>
          <article className="panel recommendation-card"><span className="eyebrow">DADOS REAIS</span><span className="recommendation-icon"><BookOpen size={21} /></span><h3>{catalog.lessons} aulas planejadas</h3><p>As métricas desta central são calculadas a partir de conclusões e avaliações salvas.</p><Link href="/tracks">Explorar trilhas <ArrowRight size={15} /></Link></article>
        </aside>
      </section>
    </main>
  );
}
