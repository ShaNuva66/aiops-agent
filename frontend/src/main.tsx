import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  X,
} from "lucide-react";
import type {
  Approval,
  Audit,
  Incident,
  Overview,
  Service,
  Source,
} from "./types";
import "./style.css";
import "./story.css";
import { ApiError, request } from "./api";
import { FaultWalkthrough, IncidentStory } from "./story";
import { AgentContribution } from "./contribution";
import { LiveCaseStudy } from "./case-study";
import { Observatory } from "./observatory";
import { VisualExperience } from "./visual-experience";
import "./app-spectrum.css";
import {
  auditLabel,
  explainEvidence,
  Glossary,
  incidentTitle,
  labelFor,
  metricDescriptions,
  PageGuide,
  pageTitles,
  reportText,
  ServiceExplanation,
  ServiceObservation,
  serviceTitle,
  sourceTitle,
  sourceSummary,
  knowledgeQuery,
  WorkflowGuide,
} from "./learning";

type Account = { username: string; csrf_token: string };

const date = (value: string | null) =>
  value
    ? new Date(
        value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value)
          ? value
          : value + "Z",
      ).toLocaleString("tr-TR")
    : "Henüz kontrol edilmedi";
const short = (value: string) => value.slice(0, 8);
function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value}`}>
      <i />
      {labelFor(value)}
    </span>
  );
}

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const accountRef = useRef<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationPassword, setConfirmationPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("veritabanı erişim");
  const [sources, setSources] = useState<Source[]>([]);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirmation, setConfirmation] = useState<Approval | null>(null);
  const [learning, setLearning] = useState(() => {
    try {
      return localStorage.getItem("aiops-explanations") !== "off";
    } catch {
      return true;
    }
  });

  const api = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      try {
        return await request<T>(path, method, body, account?.csrf_token);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          accountRef.current = null;
          setConnected(false);
          setAccount(null);
        }
        throw e;
      }
    },
    [account?.csrf_token],
  );

  useEffect(() => {
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    sessionStorage.removeItem("aiops-token");
    const restore = async () => {
      try {
        const status = await request<{ setup_required: boolean }>(
          "/auth/status",
        );
        if (live) {
          setSetupRequired(status.setup_required);
          setError("");
        }
        if (!status.setup_required) {
          try {
            const user = await request<Account>("/auth/me");
            if (live) {
              accountRef.current = user;
              setAccount(user);
            }
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 401)) throw e;
          }
        }
      } catch (e) {
        if (live) {
          setError((e as Error).message);
          retry = setTimeout(() => void restore(), 3000);
        }
      } finally {
        if (live) setAuthLoading(false);
      }
    };
    void restore();
    return () => {
      live = false;
      clearTimeout(retry);
    };
  }, []);

  async function signIn() {
    setError("");
    if (setupRequired && password !== confirmationPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    try {
      const user = await request<Account>(
        setupRequired ? "/auth/setup" : "/auth/login",
        "POST",
        {
          username: username.trim(),
          password,
          remember,
        },
      );
      accountRef.current = user;
      setAccount(user);
      setSetupRequired(false);
      setPassword("");
      setConfirmationPassword("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setSetupRequired(false);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await api("/auth/logout", "POST");
      accountRef.current = null;
      setAccount(null);
      setConnected(false);
      setSelected(null);
      setOverview(null);
      setIncidents([]);
      setServices([]);
      setAudit([]);
      setApprovals([]);
      setNotice("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const refresh = useCallback(async () => {
    if (!account) return;
    try {
      const [o, i, s, a, logs] = await Promise.all([
        api<Overview>("/overview"),
        api<Incident[]>("/incidents?limit=200"),
        api<Service[]>("/services"),
        api<Approval[]>("/approvals"),
        api<Audit[]>("/audit-events"),
      ]);
      if (accountRef.current?.csrf_token !== account.csrf_token) return;
      setOverview(o);
      setIncidents(i);
      setServices(s);
      setApprovals(a);
      setAudit(logs);
      setConnected(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, account]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (!selected) return;
    let live = true;
    const load = async () => {
      try {
        const detail = await api<Incident>("/incidents/" + selected.id);
        if (live) setSelected(detail);
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [selected?.id, api]);

  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await refresh();
      if (selected)
        setSelected(await api<Incident>("/incidents/" + selected.id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const navigate = (value: string) => {
    setTab(value);
    setSelected(null);
    setNotice("");
  };
  const healthy = services.filter((s) => s.status === "healthy").length;
  const list = incidents.filter(
    (i) =>
      filter === "all" ||
      (filter === "active" ? i.status !== "resolved" : i.status === filter),
  );
  const completedDiagnosis = selected?.diagnoses?.find(
    (d) => d.status === "completed",
  );
  const report = completedDiagnosis?.report;

  if (authLoading || (account && !connected && !error)) {
    return (
      <div className="auth-loading" role="status">
        Oturum kontrol ediliyor…
      </div>
    );
  }

  if (!connected)
    return (
      <div className="login">
        <div className="login-card">
          <div className="brand">
            <span className="brand-icon">
              <Activity size={25} />
            </span>
            AIOps<span className="muted">/ agent</span>
          </div>
          <span className="eyebrow">OPERASYON YÖNETİMİ</span>
          <h1>
            {setupRequired ? "Hesabını oluştur." : "Tekrar hoş geldin."}
            <br />
            Operasyonların burada.
          </h1>
          <p>
            {setupRequired
              ? "İlk kullanım için kullanıcı adını ve şifreni belirle. Sonraki girişlerinde bu hesabı kullanacaksın."
              : "Kullanıcı adın ve şifrenle operasyon paneline giriş yap."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void signIn();
            }}
          >
            <label htmlFor="username">Kullanıcı adı</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adın"
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9_.-]+"
              title="En az 3 karakter: harf, rakam, nokta, tire veya alt çizgi"
              required
            />
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={setupRequired ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={setupRequired ? "En az 8 karakter" : "Şifren"}
              minLength={8}
              maxLength={128}
              required
            />
            {setupRequired && (
              <>
                <label htmlFor="confirm-password">Şifreyi tekrar yaz</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmationPassword}
                  onChange={(e) => setConfirmationPassword(e.target.value)}
                  placeholder="Şifreni doğrula"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </>
            )}
            <label className="remember-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{" "}
              Beni hatırla <span>30 gün</span>
            </label>
            <button className="primary" type="submit" disabled={busy}>
              {busy
                ? "Lütfen bekle…"
                : setupRequired
                  ? "Hesap oluştur ve giriş yap"
                  : "Giriş yap"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <div className="login-foot">
            <LockKeyhole size={14} /> Hesabın ve oturumun güvenli şekilde
            saklanır.
          </div>
        </div>
        <div className="login-art">
          <div className="orb">
            <Activity size={94} />
          </div>
          <span>İZLE. İNCELE. DOĞRULA.</span>
          <p>Her kararın bir kanıtı olsun.</p>
        </div>
      </div>
    );

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          AIOps<span className="muted">/ agent</span>
        </div>
        <div className="workspace">
          <span className="workspace-icon">IST</span>
          <div>
            Havalimanı operasyonları<small>Yerel test laboratuvarı</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="nav-label">ÇALIŞMA ALANI</span>
        <nav>
          {[
            [LayoutDashboard, "Overview"],
            [TriangleAlert, "Incidents"],
            [Server, "Infrastructure"],
            [BookOpen, "Knowledge base"],
            [ShieldCheck, "Approvals"],
            [FileText, "Audit trail"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof Activity;
            return (
              <button
                key={label as string}
                className={tab === label ? "active" : ""}
                onClick={() => navigate(label as string)}
              >
                <I size={18} />
                {pageTitles[label as string]}
                {label === "Incidents" && !!overview?.incidents_active && (
                  <b>{overview.incidents_active}</b>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="safety">
            <ShieldCheck size={18} />
            <div>
              {overview?.execution_enabled
                ? "Kontrollü müdahale açık"
                : "İzleme modu · müdahale kapalı"}
              <small>Değişiklikler insan onayı gerektirir</small>
            </div>
          </div>
          <button
            className="logout"
            disabled={busy}
            onClick={() => void signOut()}
          >
            <LogOut size={16} /> Çıkış yap
          </button>
          <span className="version">AIOps Agent · v0.1.0</span>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Çalışma alanı <ChevronRight size={13} /> {pageTitles[tab]}
            {selected && (
              <>
                <ChevronRight size={13} /> {short(selected.id)}
              </>
            )}
          </div>
          <div className="header-status">
            <span className="live-dot" /> Yerel laboratuvar{" "}
            <span className="divider" />{" "}
            <span className="header-username">{account?.username}</span>
            <span className="avatar">
              {account?.username.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">IT OPERASYON PANELİ</span>
              <h1>{selected ? "Arızayı adım adım incele" : pageTitles[tab]}</h1>
              <p>
                {selected
                  ? incidentTitle(selected)
                  : "Sistemleri izle, sorunları kanıtlarla incele, sonucu doğrula."}
              </p>
            </div>
            <div className="page-tools">
              <label className="learning-toggle">
                <BookOpen size={15} />
                <input
                  type="checkbox"
                  checked={learning}
                  onChange={(e) => {
                    setLearning(e.target.checked);
                    try {
                      localStorage.setItem(
                        "aiops-explanations",
                        e.target.checked ? "on" : "off",
                      );
                    } catch {
                      /* Preference storage is optional. */
                    }
                  }}
                />{" "}
                Açıklamaları göster
              </label>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void refresh()}
              >
                <RefreshCw size={15} /> Yenile
              </button>
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button
                aria-label="Bildirimi kapat"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {overview?.runtime.last_error && (
            <div className="error">
              Son izleme kontrolü tamamlanamadı. Görünen ölçümler güncel
              olmayabilir.
              <details>
                <summary>Teknik hata türü</summary>
                {overview.runtime.last_error}
              </details>
            </div>
          )}
          {learning && (
            <details className="screen-help">
              <summary>Bu ekranı ve teknik terimleri açıkla</summary>
              <PageGuide page={selected ? "Detail" : tab} />
              <Glossary />
            </details>
          )}
          {selected ? (
            <>
              <button className="text-button" onClick={() => setSelected(null)}>
                <ArrowLeft size={15} /> Arıza listesine dön
              </button>
              <section className="panel detail-top">
                <div>
                  <Badge value={selected.status} />{" "}
                  <Badge value={selected.severity} />{" "}
                  <Badge value={selected.source_kind} />
                  <h2>{incidentTitle(selected)}</h2>
                  <p>
                    <code>{selected.id}</code>
                  </p>
                  <p>
                    Açılış: {date(selected.created_at)} · {selected.alert_count}{" "}
                    alarm bu kayıtta birleştirildi
                  </p>
                </div>
                <div className="detail-actions">
                  <button
                    disabled={busy}
                    className="secondary"
                    onClick={() =>
                      void action(
                        () =>
                          api(
                            "/incidents/" + selected.id + "/diagnoses",
                            "POST",
                          ),
                        "İnceleme sıraya alındı. Sonuç bu ekranda görünecek.",
                      )
                    }
                  >
                    Yeniden incele
                  </button>
                  {selected.status === "open" && (
                    <button
                      disabled={busy}
                      className="secondary"
                      onClick={() =>
                        void action(
                          () =>
                            api("/incidents/" + selected.id, "PATCH", {
                              status: "investigating",
                              note: "Operator started investigation",
                            }),
                          "Arıza incelemeye alındı.",
                        )
                      }
                    >
                      İncelemeye al
                    </button>
                  )}
                  {selected.status !== "resolved" && (
                    <button
                      disabled={busy}
                      className="secondary"
                      onClick={() => {
                        const note = window.prompt(
                          "Nasıl çözüldüğünü açıkla (en az 5 karakter):",
                        );
                        if (note)
                          void action(
                            () =>
                              api("/incidents/" + selected.id, "PATCH", {
                                status: "resolved",
                                note,
                              }),
                            "Arıza kaydı açıklamanla kapatıldı.",
                          );
                      }}
                    >
                      Çözüm notuyla kapat
                    </button>
                  )}
                </div>
              </section>
              <IncidentStory incident={selected} />
              <AgentContribution incident={selected} />
              <div className="detail-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <Activity size={18} /> İnceleme raporu
                    </h2>
                    <Badge
                      value={
                        completedDiagnosis?.provider ||
                        overview?.diagnosis_provider ||
                        "rules"
                      }
                    />
                  </div>
                  {selected.diagnoses?.map((d) => (
                    <div className="job" key={d.id}>
                      <Clock3 size={14} />
                      {date(d.created_at)} <Badge value={d.status} />
                      {d.error && (
                        <span className="error-inline">
                          Bu inceleme tamamlanamadı.{" "}
                          <details>
                            <summary>Teknik ayrıntı</summary>
                            {d.error}
                          </details>
                        </span>
                      )}
                    </div>
                  ))}
                  {report ? (
                    <>
                      <p className="report-summary">
                        {completedDiagnosis?.provider === "rules"
                          ? "Kaydedilmiş kontrol sonuçları sabit kurallarla değerlendirildi. Bu raporda yapay zekâ modeli kullanılmadı; gözlemler arızanın kesin nedenini tek başına belirlemez."
                          : report.summary}
                      </p>
                      {report.findings.map((f, n) => (
                        <div className="finding" key={n}>
                          <strong>
                            {completedDiagnosis?.provider === "rules" &&
                            selected.evidence?.find(
                              (e) => e.id === f.evidence_ids[0],
                            )
                              ? explainEvidence(
                                  selected.evidence.find(
                                    (e) => e.id === f.evidence_ids[0],
                                  )!,
                                  selected,
                                )
                              : f.statement}
                          </strong>
                          <small>
                            Gözleme ilişkin güven düzeyi:{" "}
                            {labelFor(f.confidence)}
                          </small>
                          <div>
                            {f.evidence_ids.map((id) => (
                              <a key={id} href={"#evidence-" + id}>
                                Dayanak kanıtı aç · {short(id)} ↗
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                      <h3>Henüz neyi bilmiyoruz?</h3>
                      <ul>
                        {report.unknowns.map((s) => (
                          <li key={s}>{reportText(s)}</li>
                        ))}
                      </ul>
                      <h3>Sıradaki kontrol önerileri</h3>
                      <ol>
                        {report.recommendations.map((s) => (
                          <li key={s}>{reportText(s)}</li>
                        ))}
                      </ol>
                      <h3>Başvurulan rehber ve geçmiş kayıtlar</h3>
                      {report.source_ids.map((id) => (
                        <code className="source-id" key={id}>
                          {id}
                        </code>
                      ))}
                      <details>
                        <summary>Orijinal teknik raporu göster</summary>
                        <pre>{JSON.stringify(report, null, 2)}</pre>
                      </details>
                    </>
                  ) : (
                    <div className="empty">
                      <CircleHelp />
                      Henüz tamamlanan bir inceleme yok. Sıradaki inceleme,
                      sistemin bir sonraki kontrol döngüsünde işlenecek.
                    </div>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <ShieldCheck size={18} /> Kontrollü çözüm işlemi
                    </h2>
                  </div>
                  <p>
                    Hazır işlem, iş uygulamasındaki kasıtlı HTTP 500 test
                    hatasını temizler. Veritabanını yeniden başlatmaz ve başka
                    arızaları otomatik düzeltmez.
                  </p>
                  <div className="callout">
                    <LockKeyhole size={18} />
                    <span>
                      Onay, yalnızca belirtilen işlem ve hedef için geçerlidir.
                      İşlemden sonra uygulamanın sağlıklı yanıtı tekrar kontrol
                      edilir.
                    </span>
                  </div>
                  <button
                    className="primary"
                    disabled={
                      busy ||
                      selected.status === "resolved" ||
                      selected.service_id !== "sample-api" ||
                      selected.check !== "availability" ||
                      selected.source_kind !== "real"
                    }
                    onClick={() =>
                      void action(
                        () =>
                          api("/approvals", "POST", {
                            incident_id: selected.id,
                            runbook: "clear-http-fault:v1",
                            target: "sample-api",
                            parameters: {},
                          }),
                        "Onay isteği oluşturuldu. İşlem onayları ekranında inceleyebilirsin.",
                      )
                    }
                  >
                    İşlem için onay iste <ArrowUpRight size={15} />
                  </button>
                  <p className="muted">
                    {overview?.execution_enabled
                      ? "Laboratuvarda onaylı müdahale açık."
                      : "Müdahale şu anda kapalı; onay verilse de işlem uygulanamaz."}
                  </p>
                  <p className="muted">
                    {selected.status === "resolved"
                      ? "Bu kayıt çözüldüğü için yeni müdahale istenemez."
                      : selected.source_kind === "simulation"
                        ? "Simülasyon kaydı gerçek bir müdahale başlatamaz."
                        : selected.service_id !== "sample-api" ||
                            selected.check !== "availability"
                          ? "Bu arıza türü için uygulanabilir bir hazır müdahale bulunmuyor."
                          : "İstek oluşturmak ve onaylamak, işlemi hemen çalıştırmaz."}
                  </p>
                  <details>
                    <summary>İşlemin teknik kimliği</summary>
                    <code>clear-http-fault:v1</code>
                  </details>
                  {selected.resolution_note && (
                    <>
                      <h3>Kapanış açıklaması</h3>
                      <p>{reportText(selected.resolution_note)}</p>
                    </>
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <h2>
                    <Terminal size={18} /> Dayanak kanıtlar
                  </h2>
                  <span className="muted">
                    Her gözlemin kaynağı ve zamanı saklanır
                  </span>
                </div>
                {selected.evidence?.map((item) => (
                  <article
                    className="evidence-card"
                    id={"evidence-" + item.id}
                    key={item.id}
                  >
                    <div>
                      <code>{short(item.id)}</code>
                      <span>Toplanma: {date(item.collected_at)}</span>
                    </div>
                    <p>{explainEvidence(item, selected)}</p>
                    <small>
                      Kaynak:{" "}
                      {item.source === "collector"
                        ? "İzleme kontrolü"
                        : item.source === "lab-telemetry"
                          ? "Yeni laboratuvar gözlemi"
                          : item.source === "test"
                            ? "Simülasyon olayı"
                            : item.source}
                    </small>
                    <details>
                      <summary>Ham teknik veriyi aç</summary>
                      <pre>{JSON.stringify(item.data, null, 2)}</pre>
                    </details>
                  </article>
                ))}
              </section>
            </>
          ) : (
            <>
              {tab === "Overview" && (
                <>
                  <LiveCaseStudy />
                  <FaultWalkthrough />
                  <div className="stats">
                    {[
                      [
                        "İzlenen servisler",
                        `${healthy}/${services.length}`,
                        "servis son kontrolde sağlıklı",
                        Server,
                      ],
                      [
                        "Açık arızalar",
                        String(overview?.incidents_active || 0),
                        "inceleme veya toparlanma bekliyor",
                        TriangleAlert,
                      ],
                      [
                        "Kapanan arızalar",
                        String(overview?.incidents_resolved || 0),
                        "sonucu kaydedilen arıza",
                        Check,
                      ],
                      [
                        "Onay bekleyen işlemler",
                        String(overview?.pending_approvals || 0),
                        "bir insanın karar vermesi gerekiyor",
                        ShieldCheck,
                      ],
                    ].map(([label, value, sub, Icon]) => {
                      const I = Icon as typeof Activity;
                      return (
                        <section className="stat" key={label as string}>
                          <div>
                            {label as string}
                            <I size={18} />
                          </div>
                          <strong>{value as string}</strong>
                          <small>{sub as string}</small>
                        </section>
                      );
                    })}
                  </div>
                  {learning && <WorkflowGuide navigate={navigate} />}
                  <div className="mode-strip">
                    <Radio size={17} />
                    <span>
                      İzleme{" "}
                      {overview?.monitor_enabled ? "açık" : "duraklatıldı"}
                    </span>
                    <span className="divider" />
                    <span>
                      İnceleme:{" "}
                      {overview?.diagnosis_provider === "rules"
                        ? "sabit kurallar · yapay zekâ kullanılmıyor"
                        : "OpenAI ajanı"}
                    </span>
                    <span className="strip-right">
                      Son döngü: {date(overview?.runtime.last_cycle_at || null)}
                    </span>
                  </div>
                  <div className="section-heading">
                    <h2>Servislerden yanıt alabiliyor muyuz?</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("Infrastructure")}
                    >
                      Kontrolleri yakından incele <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="service-grid">
                    {services.map((service) => (
                      <section className="panel service-card" key={service.id}>
                        <div className="service-head">
                          <span className="service-icon">
                            <Server size={22} />
                          </span>
                          <Badge value={service.status} />
                        </div>
                        <h3>{serviceTitle(service.id)}</h3>
                        <ServiceObservation service={service} />
                        {learning && <ServiceExplanation service={service} />}
                        <div className="service-footer">
                          <span>Son kontrol</span>
                          <span>{date(service.checked_at)}</span>
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              )}
              {(tab === "Overview" || tab === "Incidents") && (
                <section className="panel incident-panel">
                  <div className="panel-heading">
                    <h2>
                      Arıza kayıtları{" "}
                      <span className="count">{incidents.length}</span>
                    </h2>
                    <div className="segmented">
                      {["all", "active", "resolved"].map((f) => (
                        <button
                          className={filter === f ? "selected" : ""}
                          key={f}
                          onClick={() => setFilter(f)}
                        >
                          {
                            {
                              all: "Tümü",
                              active: "Açık",
                              resolved: "Çözülen",
                            }[f]
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ARIZA / SERVİS</th>
                          <th>DURUM</th>
                          <th>ÖNCELİK</th>
                          <th>VERİ TÜRÜ</th>
                          <th>ALARM</th>
                          <th>AÇILIŞ</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <button
                                className="incident-link"
                                onClick={() => {
                                  setTab("Incidents");
                                  setSelected(i);
                                }}
                              >
                                <strong>{incidentTitle(i)}</strong>
                                <small>
                                  Kayıt {short(i.id)} ·{" "}
                                  {serviceTitle(i.service_id)}
                                </small>
                              </button>
                            </td>
                            <td>
                              <Badge value={i.status} />
                            </td>
                            <td>
                              <Badge value={i.severity} />
                            </td>
                            <td>
                              <Badge value={i.source_kind} />
                            </td>
                            <td>{i.alert_count}</td>
                            <td>{date(i.created_at)}</td>
                            <td>
                              <ChevronRight size={16} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!list.length && (
                    <div className="empty">
                      <Check size={26} />
                      <strong>Bu görünümde arıza kaydı yok</strong>
                      <span>
                        Bir kontrol başarısız olduğunda açılan kayıtlar burada
                        görünür. Bu görünümün boş olması, henüz izleme verisi
                        yoksa sistemin sağlıklı olduğunu kanıtlamaz.
                      </span>
                    </div>
                  )}
                  <div className="panel-footer">
                    Son {incidents.length} kayıt · ekran 5 saniyede bir
                    yenilenir{" "}
                    <span>Gerçek gözlem ile simülasyon ayrı etiketlenir</span>
                  </div>
                </section>
              )}
              {tab === "Infrastructure" && (
                <>
                  {services.map((service) => (
                    <section className="panel" key={service.id}>
                      <div className="panel-heading">
                        <h2>
                          <Server size={18} />
                          {serviceTitle(service.id)}
                        </h2>
                        <Badge value={service.status} />
                      </div>
                      <ServiceObservation service={service} />
                      {learning && <ServiceExplanation service={service} />}
                      {service.id === "sample-api" && (
                        <>
                          <h3>Laboratuvar kaynak gözlemleri</h3>
                          <p className="metric-scope">
                            Uygulama sürecinin işlemcisi, Linux ortamının
                            belleği ve uygulamanın dosya sistemi izlenir. Bu
                            değerler PostgreSQL sürecinin kendi kaynak ölçümleri
                            değildir.
                          </p>
                          <div className="metric-grid">
                            {Object.entries(service.latest.metrics || {}).map(
                              ([name, value]) => (
                                <div className="metric" key={name}>
                                  <span>
                                    {metricDescriptions[name]?.title || name}
                                  </span>
                                  <strong>{value.toFixed(1)}%</strong>
                                  <meter min="0" max="100" value={value} />
                                  <small>
                                    {value >= 90
                                      ? "Alarm sınırına ulaştı (%90)."
                                      : "Bu gözlem alarm sınırının altında (%90)."}
                                  </small>
                                  {learning && (
                                    <p>{metricDescriptions[name]?.text}</p>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                          {!Object.keys(service.latest.metrics || {})
                            .length && <p>Henüz kaynak ölçümü alınmadı.</p>}
                        </>
                      )}
                      <details>
                        <summary>Son hata ve olay kayıtlarını (log) aç</summary>
                        {learning && (
                          <p>
                            Bu satırlar laboratuvar uygulamasının ve veritabanı
                            bağlantı kontrolünün olay kayıtlarıdır. PostgreSQL
                            container’ının bütün logları burada toplanmaz. Her
                            satır bir arıza anlamına gelmez; zamanı ve mesajı
                            birlikte değerlendir.
                          </p>
                        )}
                        <pre>
                          {JSON.stringify(service.latest.logs || [], null, 2)}
                        </pre>
                      </details>
                    </section>
                  ))}
                  <div className="callout">
                    <CircleHelp size={18} />
                    İzleme verisi alınamıyorsa “bilinmiyor” gösterilir. Veri
                    yokluğunu sağlıklı sonuç gibi yorumlamıyoruz. Kaynak
                    ölçümleri Windows bilgisayarına ait değildir.
                  </div>
                </>
              )}
              {tab === "Knowledge base" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <BookOpen size={18} /> Rehberlerde ve geçmiş arızalarda
                      ara
                    </h2>
                    <Badge value={overview?.knowledge_mode || "lexical"} />
                  </div>
                  <p>
                    Bu belgeler hangi kontrolleri yapabileceğini anlatır. Aynı
                    belirtiler farklı nedenlerden kaynaklanabilir; rehberde
                    yazanı mevcut arızanın kanıtlarıyla karşılaştır.
                  </p>
                  <form
                    className="search-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(
                        async () =>
                          setSources(
                            await api<Source[]>("/knowledge/search", "POST", {
                              query: knowledgeQuery(query),
                            }),
                          ),
                        "Kayıtlı kaynaklarda arama tamamlandı.",
                      );
                    }}
                  >
                    <Search size={18} />
                    <input
                      aria-label="Rehber araması"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      minLength={2}
                      required
                    />
                    <button className="primary" disabled={busy}>
                      Ara
                    </button>
                  </form>
                  {sources.map((s) => (
                    <article className="source-card" key={s.id}>
                      <Badge
                        value={
                          s.id.startsWith("incident:")
                            ? s.content.includes("Source kind: simulation")
                              ? "simulation"
                              : s.content.includes("Source kind: real")
                                ? "real"
                                : "unknown"
                            : s.id.startsWith("runbook:")
                              ? "runbook"
                              : "unknown"
                        }
                      />
                      <h3>{sourceTitle(s)}</h3>
                      <p>{sourceSummary(s)}</p>
                      <code>{s.id}</code>
                      <p className="muted">
                        Kaynak: {s.source} · sürüm {short(s.revision)}
                      </p>
                      <details>
                        <summary>Özgün kaynak metnini aç</summary>
                        <pre>{s.content}</pre>
                      </details>
                    </article>
                  ))}
                  {!sources.length && (
                    <div className="empty">
                      <BookOpen />
                      Kaydedilmiş kaynakları görmek için bir konu yazıp ara.
                      Örnek: veritabanı erişim.
                    </div>
                  )}
                </section>
              )}
              {tab === "Approvals" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <ShieldCheck size={18} /> İncelenecek işlem istekleri
                    </h2>
                    <span className="muted">
                      Belirli hedef · süreli onay · tek deneme
                    </span>
                  </div>
                  {approvals.map((a) => (
                    <article className="approval-card" key={a.id}>
                      <div>
                        <Badge value={a.status} />
                        <h3>
                          {a.runbook === "clear-http-fault:v1"
                            ? "Uygulamadaki HTTP 500 test hatasını temizle"
                            : a.runbook}
                        </h3>
                        <p>
                          Hedef: {serviceTitle(a.target)} · Arıza kaydı{" "}
                          <code>{short(a.incident_id)}</code>
                        </p>
                        <p>
                          Onayın son geçerlilik zamanı: {date(a.expires_at)}
                        </p>
                        {learning && (
                          <p>
                            İşlem yalnızca kasıtlı test hatasını kaldırır.
                            Sonrasında uygulamanın başarılı yanıt verip
                            vermediği kontrol edilir.
                          </p>
                        )}
                        {["pending", "approved"].includes(a.status) &&
                          new Date(a.expires_at).getTime() < Date.now() && (
                            <p className="error-inline">
                              Bu onayın süresi doldu. Uygulamak için yeni bir
                              istek gerekir.
                            </p>
                          )}
                      </div>
                      <div className="approval-actions">
                        {a.status === "pending" && (
                          <>
                            <button
                              disabled={busy}
                              className="secondary danger"
                              onClick={() =>
                                void action(
                                  () =>
                                    api(
                                      "/approvals/" + a.id + "/decision",
                                      "POST",
                                      { decision: "reject" },
                                    ),
                                  "İşlem reddedildi; bu onayla uygulanamaz.",
                                )
                              }
                            >
                              <X size={15} />
                              Reddet
                            </button>
                            <button
                              disabled={
                                busy ||
                                new Date(a.expires_at).getTime() < Date.now()
                              }
                              className="primary"
                              onClick={() => setConfirmation(a)}
                            >
                              <Check size={15} />
                              Onay isteğini incele
                            </button>
                          </>
                        )}
                        {a.status === "approved" && (
                          <button
                            disabled={
                              busy ||
                              !overview?.execution_enabled ||
                              new Date(a.expires_at).getTime() < Date.now()
                            }
                            className="primary"
                            onClick={() =>
                              void action(
                                () =>
                                  api(
                                    "/approvals/" + a.id + "/execute",
                                    "POST",
                                  ),
                                "İşlem denemesi tamamlandı. Başarılı olup olmadığını aşağıdaki sonuçtan kontrol et.",
                              )
                            }
                          >
                            Onaylı işlemi uygula
                          </button>
                        )}
                      </div>
                      {a.result != null && (
                        <div className="execution-explanation">
                          <p>
                            {a.status === "succeeded"
                              ? "İşlem uygulandı ve sonrasında uygulamadan başarılı sağlık yanıtı alındı."
                              : "İşlemin uygulanması veya işlem sonrası sağlık kontrolü tamamlanamadı. Bu onay tekrar kullanılamaz; mevcut durumu incele."}
                          </p>
                          <details>
                            <summary>
                              İşlem öncesi ve sonrası teknik sonuçlar
                            </summary>
                            <pre>{JSON.stringify(a.result, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </article>
                  ))}
                  {!approvals.length && (
                    <div className="empty">
                      <ShieldCheck />
                      Henüz bir işlem isteği yok. Uygun bir açık arıza kaydından
                      onay isteği oluşturabilirsin.
                    </div>
                  )}
                </section>
              )}
              {tab === "Audit trail" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>
                      <FileText size={18} /> Kim, ne zaman, ne yaptı?
                    </h2>
                    <span className="muted">Son 100 işlem</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>ZAMAN</th>
                          <th>İŞLEMİ YAPAN</th>
                          <th>YAPILAN İŞLEM</th>
                          <th>İLGİLİ KAYIT</th>
                          <th>AYRINTI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audit.map((a) => (
                          <tr key={a.id}>
                            <td>{date(a.created_at)}</td>
                            <td>
                              {{
                                system: "Sistem",
                                monitoring: "İzleme sistemi",
                                "diagnosis-agent": "İnceleme bileşeni",
                                operator: "Operatör",
                                executor: "Onaylı işlem yürütücüsü",
                                request: "İstek denetimi",
                              }[a.actor] || a.actor}
                            </td>
                            <td>
                              {auditLabel(a.action)}
                              <small className="audit-code">{a.action}</small>
                            </td>
                            <td>{short(a.target)}</td>
                            <td>
                              <details>
                                <summary>Ayrıntıyı aç</summary>
                                <pre>{JSON.stringify(a.details, null, 2)}</pre>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
          <footer>
            <span>
              <ShieldCheck size={14} /> Yerel test laboratuvarı · kanıta dayalı
              inceleme
            </span>
            <span>AIOps Agent / havalimanı operasyonları</span>
          </footer>
        </div>
      </main>
      {confirmation && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-title"
          >
            <ShieldCheck size={30} />
            <h2 id="approval-title">Bu işlemi onaylıyor musun?</h2>
            <p>
              İşlem: <strong>HTTP 500 test hatasını temizle</strong>
            </p>
            <p>
              Hedef: <strong>{serviceTitle(confirmation.target)}</strong>
            </p>
            <p>
              Ek işlem parametresi: <strong>Yok</strong>
            </p>
            <p>
              Bu onay, yalnızca iş uygulamasındaki kasıtlı HTTP 500 test
              hatasını temizlemek için tek denemeye izin verir. Uygulamak için
              ayrıca “Onaylı işlemi uygula” düğmesine basılmalıdır.
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setConfirmation(null)}
              >
                Vazgeç
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => {
                  const a = confirmation;
                  setConfirmation(null);
                  void action(
                    () =>
                      api("/approvals/" + a.id + "/decision", "POST", {
                        decision: "approve",
                      }),
                    "Tek işlem denemesi için onay verildi. Uygulama ayrı bir adımdır.",
                  );
                }}
              >
                Bu işlemi onayla
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VisualExperience>
      {new URLSearchParams(window.location.search).get("dashboard") === "1" ? (
        <App />
      ) : (
        <Observatory />
      )}
    </VisualExperience>
  </StrictMode>,
);
