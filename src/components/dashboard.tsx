import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Code2,
  Dumbbell,
  Layers3,
  Play,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

type DashboardProps = {
  displayName: string;
  stats: {
    totalXp: number;
    level: number;
    lessonsPassed: number;
    arenaWins: number;
    approvedSolutions: number;
    completionRate: number;
  };
  catalog: { tracks: number; lessons: number };
  nextLesson: { href: string; title: string; summary: string | null; moduleTitle: string; trackTitle: string } | null;
  trackProgress: Array<{
    id: string;
    title: string;
    topic: string;
    completed: number;
    total: number;
    percentage: number;
    href: string;
    modules: Array<{ title: string; completed: number; total: number; percentage: number }>;
  }>;
  recentActivity: Array<{ id: string; title: string; context: string; score: number; passed: boolean; href: string; createdAt: string }>;
  arenaChallenge: { title: string; summary: string; bestScore: number | null } | null;
  arenaInsights: {
    completed: number;
    attempts: number;
    averageScore: number;
    passRate: number;
    scoreTrend: number[];
    modes: Array<{ mode: string; completed: number }>;
  };
  reviewItems: string[];
};

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function Dashboard({
  displayName,
  stats,
  catalog,
  nextLesson,
  trackProgress,
  recentActivity,
  arenaChallenge,
  arenaInsights,
  reviewItems,
}: DashboardProps) {
  const firstName = displayName.split(" ")[0];
  const metrics = [
    { label: "Progresso geral", value: `${stats.completionRate}%`, detail: `${stats.lessonsPassed} de ${catalog.lessons} aulas`, icon: Target },
    { label: "Trilhas ativas", value: String(catalog.tracks), detail: "Mapas curriculares disponíveis", icon: Layers3 },
    { label: "Desafios vencidos", value: String(stats.arenaWins), detail: `${arenaInsights.attempts} tentativas na Arena`, icon: Trophy },
    { label: "Experiência", value: `${stats.totalXp} XP`, detail: `Nível ${stats.level}`, icon: Zap },
  ];

  return (
    <main className="dashboard dashboard-v2">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow"><span /> DASHBOARD</span>
          <h1>Olá, {firstName}.</h1>
          <p>Continue de onde parou ou escolha o próximo ponto de estudo.</p>
        </div>
        <div className="dashboard-header-actions">
          <Link className="button button-ghost" href="/tracks">Ver trilhas <ArrowRight size={15} /></Link>
          <Link className="button button-secondary" href="/practice"><Dumbbell size={15} /> Abrir Arena</Link>
        </div>
      </header>

      <section className="dashboard-focus-grid">
        <article className="dashboard-focus-card panel">
          <div className="dashboard-card-heading">
            <span className="recommendation-icon"><BookOpen size={20} /></span>
            <div><span className="eyebrow">CONTINUAR ESTUDANDO</span><small>{nextLesson?.trackTitle ?? "Nenhuma trilha ativa"}</small></div>
          </div>
          {nextLesson ? <>
            <span className="dashboard-focus-module">{nextLesson.moduleTitle}</span>
            <h2>{nextLesson.title}</h2>
            <p>{nextLesson.summary}</p>
            <Link className="button button-primary" href={nextLesson.href}><Play size={15} fill="currentColor" /> Abrir próxima aula</Link>
          </> : <>
            <h2>Crie sua primeira trilha</h2>
            <p>Gere um mapa curricular para o dashboard organizar seus próximos passos.</p>
            <Link className="button button-primary" href="/tracks">Escolher trilha <ArrowRight size={15} /></Link>
          </>}
        </article>

        <article className="dashboard-progress-card panel">
          <div className="dashboard-level"><span>NÍVEL ATUAL</span><strong>{String(stats.level).padStart(2, "0")}</strong><small>{stats.totalXp} XP acumulado</small></div>
          <div className="dashboard-progress-copy">
            <span className="eyebrow">VISÃO GERAL</span>
            <h2>{stats.completionRate}% concluído</h2>
            <p>Progresso combinado das suas trilhas ativas.</p>
            <div className="progress-track"><span style={{ width: `${stats.completionRate}%` }} /></div>
          </div>
        </article>
      </section>

      <section className="metric-grid dashboard-metrics">
        {metrics.map(({ label, value, detail, icon: Icon }) => <article className="metric-card panel" key={label}><span className="metric-icon"><Icon size={18} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="dashboard-arena-overview panel">
        <header className="dashboard-section-header">
          <div><span className="eyebrow">ARENA INFINITA</span><h2>Seu desempenho nos desafios</h2><p>Prática independente das aulas, com dificuldade guiada pelo seu histórico.</p></div>
          <Link className="button button-secondary" href="/practice"><Dumbbell size={15} /> {arenaChallenge ? "Continuar desafio" : "Gerar desafio"}</Link>
        </header>
        <div className="dashboard-arena-grid">
          <div className="dashboard-arena-stat-grid">
            <div><Trophy className="dashboard-stat-watermark" /><span>VENCIDOS</span><strong>{arenaInsights.completed}</strong><small>desafios concluídos</small></div>
            <div><Code2 className="dashboard-stat-watermark" /><span>TENTATIVAS</span><strong>{arenaInsights.attempts}</strong><small>soluções avaliadas</small></div>
            <div><BarChart3 className="dashboard-stat-watermark" /><span>MÉDIA</span><strong>{arenaInsights.averageScore.toFixed(1)}</strong><small>nota nas tentativas</small></div>
            <div><Target className="dashboard-stat-watermark" /><span>APROVAÇÃO</span><strong>{arenaInsights.passRate}%</strong><small>tentativas aprovadas</small></div>
          </div>
          <article className="dashboard-arena-chart">
            <div><BarChart3 size={17} /><span className="eyebrow">EVOLUÇÃO DAS NOTAS</span></div>
            {arenaInsights.scoreTrend.length ? <div className="dashboard-score-bars">
              {arenaInsights.scoreTrend.map((score, index) => <span key={`${score}-${index}`} style={{ height: `${Math.max(score * 10, 6)}%` }}><i>{score.toFixed(1)}</i></span>)}
            </div> : <p>Suas próximas tentativas formarão este gráfico.</p>}
          </article>
          <article className="dashboard-arena-current">
            <span className="eyebrow">DESAFIO ATUAL</span>
            <h3>{arenaChallenge?.title ?? "Nenhum desafio ativo"}</h3>
            <p>{arenaChallenge?.summary ?? "Gere um desafio para começar uma nova sessão de prática."}</p>
            {arenaChallenge?.bestScore !== null && arenaChallenge?.bestScore !== undefined && <span className="dashboard-arena-score">Melhor nota <strong>{Number(arenaChallenge.bestScore).toFixed(1)}</strong></span>}
            <div className="dashboard-mode-list">{arenaInsights.modes.slice(0, 3).map((mode) => <span key={mode.mode}>{mode.mode}<strong>{mode.completed}</strong></span>)}</div>
          </article>
        </div>
      </section>

      <section className="dashboard-track-section">
        <div className="section-heading"><div><span className="eyebrow">PROGRESSO DAS TRILHAS</span><h2>O que você já dominou</h2></div><Link href="/tracks">Todas as trilhas <ArrowRight size={14} /></Link></div>
        <div className="dashboard-track-details">
          {trackProgress.length ? trackProgress.map((track) => <article className="dashboard-track-detail panel" key={track.id}>
            <header><div className="dashboard-track-icon"><Code2 size={18} /></div><div><span>{track.topic}</span><h3>{track.title}</h3></div><strong>{track.percentage}%</strong></header>
            <div className="dashboard-module-chart">
              {track.modules.map((moduleData, index) => <div className="dashboard-module-bar" key={moduleData.title}>
                <span style={{ height: `${Math.max(moduleData.percentage, 3)}%` }} />
                <i>{String(index + 1).padStart(2, "0")}</i>
                <small>{moduleData.completed}/{moduleData.total}</small>
                <div className="dashboard-module-tooltip">{moduleData.title}<strong>{moduleData.percentage}%</strong></div>
              </div>)}
            </div>
            <footer><span>{track.completed} de {track.total} aulas concluídas</span><Link href={track.href}>Abrir trilha <ArrowRight size={14} /></Link></footer>
          </article>) : <div className="dashboard-empty panel">Nenhuma trilha ativa.</div>}
        </div>
      </section>

      <section className="dashboard-bottom-grid">
        <section className="dashboard-bottom-column">
          <div className="section-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>5 atividades recentes</h2></div></div>
          <div className="dashboard-activity-list panel">
            {recentActivity.length ? recentActivity.map((activity) => <Link href={activity.href} className="dashboard-activity-row" key={activity.id}>
              <span className={`dashboard-activity-status ${activity.passed ? "is-passed" : ""}`}><CheckCircle2 size={16} /></span>
              <div><strong>{activity.title}</strong><small>{activity.context}</small></div>
              <span>{formatActivityDate(activity.createdAt)}</span>
              <b>{activity.score.toFixed(1)}</b>
            </Link>) : <div className="dashboard-empty">Suas avaliações aparecerão aqui.</div>}
          </div>
        </section>
        <section className="dashboard-bottom-column">
          <div className="section-heading"><div><span className="eyebrow">PARA REVISAR</span><h2>Próximos focos</h2></div></div>
          <article className="panel dashboard-review-card">
            {reviewItems.length ? <ul>{reviewItems.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul> : <p>Conclua uma avaliação para receber pontos de revisão.</p>}
          </article>
        </section>
      </section>
    </main>
  );
}
