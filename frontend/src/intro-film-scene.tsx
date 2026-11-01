import { useId } from "react";
import {
  Activity,
  Bot,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Database,
  FileSearch,
  FileText,
  LockKeyhole,
  Monitor,
  Server,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { IntroSlide } from "./intro-slides";
import { introProof } from "./intro-slides";
import { caseReport, modelTools, outcome } from "./observatory-data";
import "./intro-film-scene.css";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const segment = (time: number, start: number, end: number) =>
  clamp((time - start) / (end - start));
const ease = (value: number) => value * value * (3 - 2 * value);
const mix = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;
type Point = [number, number];

function Reveal({
  time,
  at,
  duration = 0.09,
  children,
}: {
  time: number;
  at: number;
  duration?: number;
  children: ReactNode;
}) {
  const shown = ease(segment(time, at, at + duration));
  return (
    <g opacity={shown} transform={`translate(0 ${12 * (1 - shown)})`}>
      {children}
    </g>
  );
}

function Wire({
  from,
  to,
  amount,
  tone = "cyan",
  bend,
  enabled = true,
}: {
  from: Point;
  to: Point;
  amount: number;
  tone?: string;
  bend?: Point;
  enabled?: boolean;
}) {
  const t = clamp(amount);
  const x = bend
    ? (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * bend[0] + t ** 2 * to[0]
    : mix(from[0], to[0], t);
  const y = bend
    ? (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * bend[1] + t ** 2 * to[1]
    : mix(from[1], to[1], t);
  const d = bend
    ? `M${from.join(" ")} Q${bend.join(" ")} ${to.join(" ")}`
    : `M${from.join(" ")} L${to.join(" ")}`;
  return (
    <g className={`film-wire film-${tone}`}>
      <path className="film-wire-track" d={d} />
      {enabled && (
        <>
          <path
            className="film-wire-fill"
            d={d}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - t}
          />
          {t > 0 && t < 1 && (
            <g transform={`translate(${x} ${y})`}>
              <circle className="film-packet-halo" r="15" />
              <circle className="film-packet" r="5" />
              <circle className="film-packet-center" r="2" />
            </g>
          )}
        </>
      )}
    </g>
  );
}

function Node({
  x,
  y,
  icon: Icon,
  title,
  detail,
  tone = "cyan",
  active = false,
}: {
  x: number;
  y: number;
  icon: LucideIcon;
  title: string;
  detail?: string;
  tone?: string;
  active?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`film-node film-${tone} ${active ? "is-active" : ""}`}
    >
      <ellipse className="film-node-shadow" cy="68" rx="78" ry="12" />
      <path className="film-node-base" d="M-70 45L0 65L70 45V54L0 75L-70 54Z" />
      <rect
        className="film-node-box"
        x="-68"
        y="-56"
        width="136"
        height="103"
        rx="18"
      />
      <path className="film-node-top" d="M-50-56H50" />
      <Icon x={-25} y={-36} width={50} height={50} strokeWidth={1.4} />
      <text className="film-node-title" y="33">
        {title}
      </text>
      {detail && (
        <text className="film-node-detail" y="101">
          {detail}
        </text>
      )}
      <circle className="film-node-indicator" cx="49" cy="-37" r="3" />
    </g>
  );
}

function Rack({
  x,
  y,
  fault,
  label,
  clearing = false,
}: {
  x: number;
  y: number;
  fault: boolean;
  label: string;
  clearing?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`film-rack ${fault ? "film-coral" : "film-cyan"}`}
    >
      <ellipse className="film-node-shadow" cx="15" cy="132" rx="107" ry="24" />
      <path className="film-rack-side" d="M70-110L105-91V114L70 137Z" />
      <path className="film-rack-roof" d="M-70-110L-35-132L105-91L70-70Z" />
      <rect
        className="film-rack-body"
        x="-70"
        y="-110"
        width="140"
        height="240"
        rx="12"
      />
      {[-79, -24, 31].map((top) => (
        <g key={top}>
          <rect
            className="film-rack-slot"
            x="-52"
            y={top}
            width="104"
            height="40"
            rx="6"
          />
          <path
            className="film-rack-vent"
            d={`M-39 ${top + 13}H10M-39 ${top + 22}H10`}
          />
          <circle className="film-rack-led" cx="36" cy={top + 19} r="4" />
        </g>
      ))}
      <text className="film-rack-name" y="112">
        sample-api
      </text>
      {clearing && (
        <path className="film-clear-sweep" d="M-56 77L-19 105L49 54" />
      )}
      <text className="film-node-detail" x="12" y="174">
        {label}
      </text>
    </g>
  );
}

function Chip({
  x,
  y,
  text,
  tone = "cyan",
  width = 170,
}: {
  x: number;
  y: number;
  text: string;
  tone?: string;
  width?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} className={`film-chip film-${tone}`}>
      <rect x={-width / 2} y="-22" width={width} height="44" rx="22" />
      <text y="7">{text}</text>
    </g>
  );
}

function Document({
  x,
  y,
  label,
  lines = 3,
  tone = "cyan",
  report = false,
}: {
  x: number;
  y: number;
  label: string;
  lines?: number;
  tone?: string;
  report?: boolean;
}) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      className={`film-document film-${tone}`}
    >
      <rect
        className="film-document-back"
        x="-67"
        y="-76"
        width="143"
        height="169"
        rx="12"
        transform="rotate(5)"
      />
      <rect
        className="film-document-front"
        x="-77"
        y="-87"
        width="143"
        height="169"
        rx="12"
      />
      {report ? (
        <FileText x={-57} y={-68} width={32} height={32} strokeWidth={1.4} />
      ) : (
        <FileSearch x={-57} y={-68} width={32} height={32} strokeWidth={1.4} />
      )}
      {Array.from({ length: lines }, (_, index) => (
        <path
          className={`film-document-line ${index === 0 ? "is-emphasized" : ""}`}
          key={index}
          d={`M-55 ${index * 22 - 6}H${index % 2 ? 23 : 42}`}
        />
      ))}
      <text className="film-node-title" x="-5" y="119">
        {label}
      </text>
    </g>
  );
}

function PurposeScene({ t }: { t: number }) {
  return (
    <>
      <Wire from={[160, 240]} to={[320, 240]} amount={segment(t, 0, 0.22)} />
      <Wire
        from={[451, 205]}
        to={[595, 122]}
        bend={[535, 120]}
        amount={segment(t, 0.2, 0.44)}
      />
      <Wire
        from={[620, 172]}
        to={[620, 235]}
        amount={segment(t, 0.43, 0.64)}
        tone="blue"
      />
      <Wire
        from={[620, 315]}
        to={[620, 366]}
        amount={segment(t, 0.64, 0.85)}
        tone="amber"
      />
      <Wire
        from={[560, 390]}
        to={[390, 290]}
        bend={[390, 400]}
        amount={segment(t, 0.84, 1)}
        tone="green"
      />
      <Node x={90} y={240} icon={UserRound} title="Çalışan" active={t < 0.2} />
      <Node
        x={385}
        y={240}
        icon={Server}
        title="Uygulama"
        active={t < 0.3 || t > 0.84}
      />
      <Node
        x={620}
        y={110}
        icon={Activity}
        title="İzleme"
        active={t >= 0.2 && t < 0.44}
      />
      <Node
        x={620}
        y={260}
        icon={Bot}
        title="AI agent"
        tone="blue"
        active={t >= 0.44 && t < 0.64}
      />
      <Node
        x={620}
        y={405}
        icon={ShieldCheck}
        title="Yetkili"
        tone="amber"
        active={t >= 0.64 && t < 0.85}
      />
      <Reveal time={t} at={0.79}>
        <Chip x={270} y={405} text="Kontrol insanda" tone="amber" width={208} />
      </Reveal>
    </>
  );
}

function StackScene({ t }: { t: number }) {
  return (
    <>
      <Wire from={[210, 165]} to={[330, 165]} amount={segment(t, 0.05, 0.25)} />
      <Wire from={[466, 165]} to={[585, 165]} amount={segment(t, 0.27, 0.5)} />
      <Wire
        from={[400, 217]}
        to={[400, 339]}
        amount={segment(t, 0.6, 0.83)}
        tone="blue"
      />
      <Node
        x={140}
        y={165}
        icon={Monitor}
        title="Arayüz"
        detail="React · TypeScript"
        active={t < 0.25}
      />
      <Node
        x={400}
        y={165}
        icon={Server}
        title="Kontrol"
        detail="Python · FastAPI"
        tone="blue"
        active={t >= 0.25 && t < 0.5}
      />
      <Node
        x={655}
        y={165}
        icon={Database}
        title="Vaka verisi"
        detail={
          introProof.environment.includes("SQLite")
            ? "SQLite"
            : "Ortam kaydı yok"
        }
        active={t >= 0.5 && t < 0.75}
      />
      <Node
        x={400}
        y={391}
        icon={Bot}
        title="AI incelemesi"
        detail={introProof.hasReport ? introProof.model : "Rapor yok"}
        tone="blue"
        active={t >= 0.75}
      />
      <Reveal time={t} at={0.73}>
        <Chip
          x={655}
          y={378}
          text={
            introProof.environment.includes("Windows")
              ? "Bu vaka: Windows"
              : "Ortam kaydı yok"
          }
          width={220}
        />
      </Reveal>
    </>
  );
}

function FailureScene({ t }: { t: number }) {
  const failed = outcome.beforeStatus === 500 && t >= 0.25;
  return (
    <>
      <g
        transform="translate(205 225)"
        className={`film-browser ${failed ? "film-coral" : "film-cyan"}`}
      >
        <rect
          className="film-browser-frame"
          x="-142"
          y="-111"
          width="284"
          height="220"
          rx="17"
        />
        <path className="film-browser-rule" d="M-142-70H142" />
        <circle cx="-119" cy="-91" r="4" />
        <circle cx="-104" cy="-91" r="4" />
        <circle cx="-89" cy="-91" r="4" />
        <text className="film-browser-url" x="-58" y="-84">
          İş uygulaması
        </text>
        <Monitor x={-24} y={-41} width={48} height={48} strokeWidth={1.3} />
        <text className="film-response-big" y="73">
          {failed ? "500" : outcome.hasInitialSuccess ? "200" : "?"}
        </text>
        <text className="film-node-detail" y="153">
          {failed ? "İstek tamamlanamadı" : "Kullanıcı isteği"}
        </text>
      </g>
      <Wire from={[350, 205]} to={[535, 205]} amount={segment(t, 0, 0.25)} />
      <Wire
        from={[535, 269]}
        to={[350, 269]}
        amount={segment(t, 0.27, 0.57)}
        tone={failed ? "coral" : "cyan"}
        enabled={outcome.beforeStatus === 500}
      />
      <Rack
        x={620}
        y={230}
        fault={failed}
        label={failed ? "Kontrollü test hatası" : "Test uygulaması"}
      />
      <Reveal time={t} at={0.51}>
        <Chip
          x={438}
          y={450}
          text={
            outcome.beforeStatus === 500
              ? "HTTP 500 · başarısız"
              : "Yanıt doğrulanamadı"
          }
          tone={failed ? "coral" : "amber"}
          width={267}
        />
      </Reveal>
    </>
  );
}

function DetectionScene({ t }: { t: number }) {
  const known = introProof.detectionRecorded;
  return (
    <>
      <Node
        x={125}
        y={250}
        icon={Server}
        title="Uygulama"
        detail={outcome.beforeStatus === 500 ? "HTTP 500" : "Sonuç bilinmiyor"}
        tone="coral"
        active={t < 0.25}
      />
      <Wire
        from={[190, 225]}
        to={[338, 150]}
        bend={[235, 145]}
        amount={segment(t, 0, 0.28)}
      />
      <Node x={405} y={150} icon={Activity} title="İzleme" active={t < 0.5} />
      <rect
        className="film-scan-line"
        x="344"
        y={101 + segment(t, 0, 0.25) * 86}
        width="123"
        height="2"
        opacity={t < 0.28 ? 0.85 : 0}
      />
      <Wire
        from={[472, 175]}
        to={[606, 253]}
        bend={[600, 175]}
        amount={segment(t, 0.25, 0.49)}
        enabled={known}
      />
      <Reveal time={t} at={0.29}>
        <Document
          x={665}
          y={280}
          label={known ? "Arıza kaydı" : "Açılış kanıtı yok"}
          tone={known ? "cyan" : "amber"}
          lines={1 + Math.floor(segment(t, 0.3, 0.7) * 3)}
        />
      </Reveal>
      <Reveal time={t} at={0.51}>
        <Chip
          x={350}
          y={355}
          text={known ? "İlk kanıt saklandı" : "Kanıt doğrulanamadı"}
          width={248}
        />
      </Reveal>
      <Reveal time={t} at={0.76}>
        <Chip
          x={350}
          y={420}
          text="Sıradaki adım: inceleme"
          width={280}
          tone="blue"
        />
      </Reveal>
    </>
  );
}

function AgentScene({ t }: { t: number }) {
  return (
    <>
      <Node
        x={125}
        y={125}
        icon={FileSearch}
        title="Kanıtlar"
        detail={
          introProof.hasEvidenceTool ? "Araç çağrısı kayıtlı" : "Araç kaydı yok"
        }
        active={t < 0.25}
      />
      <Node
        x={125}
        y={365}
        icon={BookOpen}
        title="Rehber"
        detail={
          introProof.hasGuideTool
            ? caseReport?.source_ids.includes("runbook:http500")
              ? "HTTP 500 rehberi"
              : "Rehber araması kayıtlı"
            : "Araç kaydı yok"
        }
        tone="amber"
        active={t >= 0.25 && t < 0.5}
      />
      <Wire
        from={[192, 125]}
        to={[343, 223]}
        bend={[340, 125]}
        amount={segment(t, 0, 0.25)}
        enabled={introProof.hasEvidenceTool}
      />
      <Wire
        from={[192, 365]}
        to={[343, 269]}
        bend={[340, 365]}
        amount={segment(t, 0.25, 0.5)}
        tone="amber"
        enabled={introProof.hasGuideTool}
      />
      <g className="film-ai-orbit" transform="translate(410 245)">
        <circle r="103" />
        <circle r="116" strokeDasharray="3 9" />
        <circle r="126" strokeDasharray="39 260" strokeDashoffset={-t * 250} />
      </g>
      <Node
        x={410}
        y={245}
        icon={Bot}
        title="AI agent"
        detail={`${modelTools.length} kayıtlı araç`}
        tone="blue"
        active={t >= 0.5 && t < 0.75}
      />
      <Wire
        from={[478, 245]}
        to={[594, 245]}
        amount={segment(t, 0.46, 0.55)}
        tone="blue"
        enabled={introProof.hasReport}
      />
      <Reveal time={t} at={0.5} duration={0.05}>
        <Document
          x={680}
          y={245}
          label={introProof.hasReport ? "Kaynaklı rapor" : "Rapor bulunamadı"}
          report
          tone="blue"
          lines={1 + Math.floor(segment(t, 0.5, 0.74) * 3)}
        />
      </Reveal>
      <Reveal time={t} at={0.84}>
        <Chip
          x={410}
          y={448}
          text="İnceleme ≠ müdahale"
          width={266}
          tone="blue"
        />
      </Reveal>
    </>
  );
}

function ActionScene({ t }: { t: number }) {
  const approved = outcome.hasSuccessfulApproval;
  const done = approved && t >= 0.75;
  return (
    <>
      <Node
        x={120}
        y={225}
        icon={UserRound}
        title="Yetkili"
        detail="Test yürütücüsü"
        tone="amber"
        active={t < 0.25}
      />
      <Wire
        from={[188, 225]}
        to={[319, 225]}
        amount={segment(t, 0, 0.25)}
        tone="amber"
        enabled={approved}
      />
      <Node
        x={387}
        y={225}
        icon={approved && t >= 0.25 ? ShieldCheck : LockKeyhole}
        title={approved && t >= 0.25 ? "Onay kayıtlı" : "Yetki sınırı"}
        tone="amber"
        active={t >= 0.25 && t < 0.5}
      />
      <Reveal time={t} at={0.28}>
        <Chip
          x={387}
          y={365}
          text={approved ? "Yalnızca sample-api" : "Onay doğrulanamadı"}
          tone="amber"
          width={253}
        />
      </Reveal>
      <Wire
        from={[455, 225]}
        to={[565, 225]}
        amount={segment(t, 0.5, 0.75)}
        tone="amber"
        enabled={approved}
      />
      <Rack
        x={650}
        y={225}
        fault={!done && outcome.beforeStatus === 500}
        clearing={done}
        label={done ? "Test hatası temizlendi" : "Sabit yürütücü hedefi"}
      />
      <Reveal time={t} at={0.76}>
        <Chip
          x={387}
          y={433}
          text={approved ? "İşlem sonrası HTTP 200" : "İşlem sonucu bilinmiyor"}
          tone={approved ? "green" : "amber"}
          width={295}
        />
      </Reveal>
    </>
  );
}

function RecoveryScene({ t }: { t: number }) {
  return (
    <>
      <Node
        x={125}
        y={225}
        icon={Server}
        title="Uygulama"
        detail={outcome.hasSuccessfulApproval ? "HTTP 200" : "Yanıt bilinmiyor"}
        tone={outcome.hasSuccessfulApproval ? "green" : "amber"}
        active={t < 0.25}
      />
      <Wire
        from={[193, 225]}
        to={[338, 225]}
        amount={segment(t, 0, 0.3)}
        tone="green"
        enabled={outcome.hasSuccessfulApproval}
      />
      <Node
        x={405}
        y={225}
        icon={Activity}
        title="Ayrı izleme"
        detail={
          outcome.hasVerifiedRecovery && t >= 0.5
            ? "Sağlıklı gözlem"
            : "Sonuç kontrolü"
        }
        tone={outcome.hasVerifiedRecovery && t >= 0.5 ? "green" : "cyan"}
        active={t >= 0.25 && t < 0.7}
      />
      <Wire
        from={[473, 225]}
        to={[604, 225]}
        amount={segment(t, 0.5, 0.77)}
        tone="green"
        enabled={outcome.hasVerifiedRecovery}
      />
      <Node
        x={672}
        y={225}
        icon={
          outcome.hasVerifiedRecovery && t >= 0.75 ? CheckCircle2 : FileText
        }
        title={
          outcome.hasVerifiedRecovery && t >= 0.75
            ? "Arıza kapandı"
            : "Arıza kaydı"
        }
        tone={outcome.hasVerifiedRecovery && t >= 0.75 ? "green" : "cyan"}
        active={t >= 0.75}
      />
      <Reveal time={t} at={0.25}>
        <Chip
          x={275}
          y={365}
          text={
            outcome.hasSuccessfulApproval
              ? "HTTP kontrolü ✓"
              : "HTTP kanıtı yok"
          }
          tone={outcome.hasSuccessfulApproval ? "green" : "amber"}
          width={233}
        />
      </Reveal>
      <Reveal time={t} at={0.55}>
        <Chip
          x={545}
          y={365}
          text={
            outcome.hasVerifiedRecovery
              ? "İzleme gözlemi ✓"
              : "Toparlanma kanıtı yok"
          }
          tone={outcome.hasVerifiedRecovery ? "green" : "amber"}
          width={251}
        />
      </Reveal>
      <Reveal time={t} at={0.79}>
        <Chip
          x={410}
          y={441}
          text={
            outcome.hasVerifiedRecovery
              ? "İki kontrol. Kayıtlı sonuç."
              : "Sonuç doğrulanamadı"
          }
          tone={outcome.hasVerifiedRecovery ? "green" : "amber"}
          width={310}
        />
      </Reveal>
    </>
  );
}

function sceneStatus(id: IntroSlide["id"], beat: number) {
  const labels: Record<IntroSlide["id"], string[]> = {
    purpose: [
      "Uygulamayı kullan",
      "Sorunu fark et",
      "Kanıtı incele",
      "Yetkiyle müdahale et",
    ],
    stack: [
      "Arayüz",
      "Kontrol servisi",
      "Bu vakanın kayıtları",
      "AI incelemesi",
    ],
    failure: [
      "İstek gönderiliyor",
      outcome.beforeStatus === 500 ? "Test hatası açık" : "Hata bilinmiyor",
      outcome.beforeStatus === 500 ? "HTTP 500 döndü" : "Yanıt doğrulanamadı",
      outcome.beforeStatus === 500
        ? "Kullanıcı isteği tamamlanamadı"
        : "İsteğin sonucu bilinmiyor",
    ],
    detection: [
      "İzleme kontrol ediyor",
      introProof.detectionRecorded
        ? "Arıza kaydı açıldı"
        : "Açılış kanıtı eksik",
      introProof.detectionRecorded
        ? "İlk kanıt saklandı"
        : "İlk kanıt bilinmiyor",
      "Sonraki aşama: inceleme",
    ],
    agent: [
      introProof.hasEvidenceTool
        ? "Hata kanıtları okunuyor"
        : "Kanıt aracı doğrulanamadı",
      introProof.hasGuideTool
        ? "Çözüm rehberi okunuyor"
        : "Rehber aracı doğrulanamadı",
      introProof.hasReport
        ? "AI bulguları açıklıyor"
        : "AI raporu doğrulanamadı",
      introProof.hasReport ? "Kaynaklı rapor hazır" : "Rapor bulunamadı",
    ],
    action: [
      "Yetki ayrı mekanizmada",
      outcome.hasSuccessfulApproval
        ? "Onay kaydı doğrulandı"
        : "Onay doğrulanamadı",
      "Yalnızca sabit işlem",
      outcome.hasSuccessfulApproval
        ? "İşlem sonrası HTTP 200"
        : "İşlem sonucu bilinmiyor",
    ],
    recovery: [
      "Sonuç yeniden kontrol ediliyor",
      outcome.hasSuccessfulApproval
        ? "HTTP 200 doğrulandı"
        : "HTTP kanıtı eksik",
      outcome.hasVerifiedRecovery
        ? "İzleme sağlıklı gördü"
        : "Toparlanma kanıtı eksik",
      outcome.hasVerifiedRecovery
        ? "Arıza toparlanma ile kapandı"
        : "Sonuç doğrulanamadı",
    ],
  };
  return labels[id][beat];
}

/** All causal positions and results follow the seekable film clock, not CSS timers. */
export function IntroFilmScene({
  id,
  progress,
  playing,
  motion,
}: {
  id: IntroSlide["id"];
  progress: number;
  playing: boolean;
  motion: boolean;
}) {
  const gradient = `film-${useId().replace(/:/g, "")}`;
  const t = Number.isFinite(progress) ? clamp(progress) : 0;
  const beat = Math.min(3, Math.floor(t * 4));
  const scenes = {
    purpose: PurposeScene,
    stack: StackScene,
    failure: FailureScene,
    detection: DetectionScene,
    agent: AgentScene,
    action: ActionScene,
    recovery: RecoveryScene,
  };
  const Scene = scenes[id];
  const success =
    id === "recovery" && beat === 3 && outcome.hasVerifiedRecovery;
  return (
    <div
      className="intro-film-scene"
      data-scene={id}
      data-beat={beat}
      data-motion={motion ? "on" : "off"}
      data-playing={playing ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="film-scene-topline">
        <span>
          <i /> KAYITLI VAKANIN GÖRSEL ANLATIMI
        </span>
        <span>ADIM {beat + 1} / 4</span>
      </div>
      <svg
        className="film-scene-canvas"
        viewBox="0 0 800 510"
        fill="none"
        focusable="false"
      >
        <defs>
          <radialGradient id={gradient}>
            <stop
              stopColor={
                id === "failure"
                  ? "#ad6d6c"
                  : id === "action"
                    ? "#9a805a"
                    : "#376b8f"
              }
              stopOpacity=".26"
            />
            <stop offset="1" stopColor="#152438" stopOpacity="0" />
          </radialGradient>
          <pattern
            id={`${gradient}-grid`}
            width="40"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="skewX(-25)"
          >
            <path d="M40 0H0V24" stroke="#8fb5d3" strokeOpacity=".055" />
          </pattern>
        </defs>
        <ellipse
          cx="408"
          cy="272"
          rx="390"
          ry="240"
          fill={`url(#${gradient})`}
        />
        <path
          className="film-floor"
          d="M35 348L405 159L778 348L405 502Z"
          fill={`url(#${gradient}-grid)`}
        />
        <path
          className="film-horizon"
          d="M70 345L405 177L742 345M70 345L405 479L742 345"
        />
        <g className="film-decorative-orbit">
          <ellipse cx="408" cy="315" rx="290" ry="140" strokeDasharray="2 15" />
        </g>
        <Scene t={t} />
      </svg>
      <div className={`film-scene-status ${success ? "is-verified" : ""}`}>
        {success ? (
          <CheckCircle2 size={21} />
        ) : id === "failure" && beat >= 1 ? (
          <CircleHelp size={21} />
        ) : (
          <Activity size={21} />
        )}
        <span>{sceneStatus(id, beat)}</span>
        <span className="film-beat-markers">
          {[0, 1, 2, 3].map((value) => (
            <i key={value} data-reached={value <= beat} />
          ))}
        </span>
      </div>
    </div>
  );
}
