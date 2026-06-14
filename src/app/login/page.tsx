import { ArrowRight, Braces, Check, Cpu, ShieldCheck, Sparkles } from "lucide-react";
import { signIn } from "@/app/auth/actions";
import { Brand } from "@/components/brand";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <Brand />
        <div className="auth-showcase-copy">
          <span className="eyebrow"><span /> TREINAMENTO TÉCNICO AVANÇADO</span>
          <h1>Estude código.<br /><em>Prove domínio.</em></h1>
          <p>Uma plataforma feita para transformar prática consistente em evolução técnica mensurável.</p>
          <div className="auth-features">
            <span><Check size={15} /> Avaliação exigente por IA</span>
            <span><Check size={15} /> Trilhas com progressão real</span>
            <span><Check size={15} /> Prática focada em C++ e Unreal</span>
          </div>
        </div>
        <div className="auth-code-card">
          <div className="code-card-header"><span /><span /><span /><small>MyActor.cpp</small></div>
          <pre><code><span className="code-purple">void</span> AMyActor::<span className="code-blue">BeginPlay</span>() {"{"}
{"\n"}  <span className="code-purple">Super</span>::BeginPlay();
{"\n"}  Training-&gt;<span className="code-blue">Start</span>();
{"\n"}{"}"}</code></pre>
          <div className="code-score"><Sparkles size={15} /> Domínio detectado <strong>9,6</strong></div>
        </div>
        <div className="auth-visual-icons">
          <span><Braces /></span><span><Cpu /></span><span><ShieldCheck /></span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="auth-kicker">ACESSO PESSOAL</span>
          <h2>Continue sua evolução.</h2>
          <p>Entre com sua conta para acessar a central.</p>
          {message && <div className="auth-message">{message}</div>}
          <form className="auth-form" action={signIn}>
            <label><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
            <label><span>Senha</span><input name="password" type="password" autoComplete="current-password" minLength={6} required /></label>
            <button className="button button-primary auth-submit" type="submit">Entrar na central <ArrowRight size={16} /></button>
          </form>
          <small className="auth-legal">Acesso restrito ao proprietário.</small>
        </div>
      </section>
    </main>
  );
}
