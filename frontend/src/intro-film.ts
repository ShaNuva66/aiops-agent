import recordedCase from "./live-case.json";
import { buildCaseView } from "./observatory-data";
import type { RecordedCase } from "./observatory-data";
import { buildIntroProof } from "./intro-slides";
import type { IntroSlide } from "./intro-slides";

export type FilmCue = {
  /** Seconds from this chapter's start, not the original incident timestamp. */
  at: number;
  text: string;
  label: string;
};

export type FilmChapter = {
  id: IntroSlide["id"];
  title: string;
  start: number;
  duration: number;
  cues: FilmCue[];
};

type ChapterScript = Omit<FilmChapter, "start" | "cues"> & {
  cues: Omit<FilmCue, "at">[];
};

/** A paced retelling of stored proof; these seconds are presentation time. */
export function buildIntroFilm(record: RecordedCase): FilmChapter[] {
  const { outcome, casePhases } = buildCaseView(record);
  const proof = buildIntroProof(record);
  const databaseHealthy =
    casePhases.find((phase) => phase.id === "failure")?.database === "healthy";
  const hasFault = outcome.beforeStatus === 500;
  const chapters: ChapterScript[] = [
    {
      id: "purpose",
      title: "Sorunu fark et. Çözümü doğrula.",
      duration: 12,
      cues: [
        { label: "Çalışan", text: "Bir çalışan uygulamadan yanıt bekler." },
        {
          label: "İzleme",
          text: "AIOps, uygulamanın yanıtını düzenli kontrol eder.",
        },
        {
          label: "Birlikte çalışma",
          text: "AI kanıtları yorumlar; yetkili kişi müdahaleye karar verir.",
        },
        {
          label: "Kayıtlı vaka",
          text: "Şimdi kayıtlı bir laboratuvar olayını adım adım izleyeceğiz.",
        },
      ],
    },
    {
      id: "stack",
      title: "Bu sistemin parçaları nasıl birleşiyor?",
      duration: 12,
      cues: [
        {
          label: "Arayüz",
          text: "Gördüğün ekran React ve TypeScript ile yazıldı.",
        },
        {
          label: "Kontrol ve kayıt",
          text: "Python ve FastAPI, kontrolleri ve onay akışını yönetir.",
        },
        {
          label: "Bu vakanın ortamı",
          text:
            proof.environment === "Windows + SQLite laboratuvarı"
              ? "Bu vaka Windows ve SQLite laboratuvarında kaydedildi."
              : `Bu vakanın ortamı: ${proof.environment}.`,
        },
        {
          label: "AI bileşeni",
          text: proof.hasReport
            ? "OpenAI incelemesi bu kayıtta; Docker/PostgreSQL testleri ayrı."
            : "OpenAI isteğe bağlı; bu vakada tamamlanmış AI raporu yok.",
        },
      ],
    },
    {
      id: "failure",
      title: hasFault
        ? "İstek gitti. Bu kez hata döndü."
        : "İlk hata sonucu doğrulanamadı.",
      duration: 14,
      cues: [
        {
          label: "Önceki durum",
          text: outcome.hasInitialSuccess
            ? "Arıza öncesi kontrol HTTP 200 ile başarılıydı."
            : "Arıza öncesi başarılı HTTP kontrolü doğrulanamadı.",
        },
        {
          label: hasFault ? "Kontrollü hata" : "Hata kanıtı eksik",
          text: hasFault
            ? "Test yürütücüsü, laboratuvar uygulamasında kontrollü HTTP hatası açtı."
            : "Kontrollü HTTP 500 hatasını doğrulayacak kayıt eksik.",
        },
        {
          label: "Uygulama yanıtı",
          text: hasFault
            ? "Yeni istek HTTP 500 aldı; uygulama isteği tamamlayamadı."
            : "Başarısız HTTP yanıtı bu kayıttan doğrulanamadı.",
        },
        {
          label: "Hatanın sınırı",
          text:
            hasFault && databaseHealthy
              ? "Aynı kayıtta veritabanı sağlıklı; uygulamanın yanıtı hatalı."
              : "HTTP hatası tek başına veritabanının durduğunu kanıtlamaz.",
        },
      ],
    },
    {
      id: "detection",
      title: proof.detectionRecorded
        ? "İzleme, hatayı görünür hale getirdi."
        : "Arıza açılışının kanıtı eksik.",
      duration: 14,
      cues: [
        {
          label: "Başarısız kontrol",
          text: proof.detectionRecorded
            ? "İzleme sistemi tekrarlanan başarısız kontrolleri fark etti."
            : "Arıza açılışıyla eşleşen ilk gözlem doğrulanamadı.",
        },
        {
          label: "Arıza kaydı",
          text: proof.detectionRecorded
            ? "Hata için bir arıza kaydı açıldı."
            : "Arıza kaydının açılış kanıtı bulunamadı.",
        },
        {
          label: "Saklanan kanıt",
          text: proof.detectionRecorded
            ? "İlk hata gözlemi saklandı; ekip kaynağa dönebiliyor."
            : "İlk kanıtın saklandığını bu kayıttan doğrulayamıyoruz.",
        },
        {
          label: "İzleme ve AI",
          text: "Bu aşama sabit kurallarla çalışır; AI incelemesi ayrı bir adımdır.",
        },
      ],
    },
    {
      id: "agent",
      title: proof.hasReport
        ? "AI, gördüğünü bir raporla açıkladı."
        : "AI raporu bu kayıtta bulunamadı.",
      duration: 18,
      cues: [
        {
          label: "Kanıt okuma",
          text: proof.hasEvidenceTool
            ? "Agent bu arızaya bağlı hata kanıtlarını okudu."
            : "Bu incelemeye bağlı kanıt okuma aracı doğrulanamadı.",
        },
        {
          label: "Rehber arama",
          text: proof.hasGuideTool
            ? "Ardından kayıtlı çözüm rehberlerinde arama yaptı."
            : "Bu incelemeye bağlı rehber arama aracı doğrulanamadı.",
        },
        {
          label: "İnceleme raporu",
          text: proof.hasReport
            ? "Bulgular ve önerilen kontroller rapora yazıldı."
            : "Tamamlanmış OpenAI raporu olmadan AI katkısını doğrulayamıyoruz.",
        },
        {
          label: "Yetki sınırı",
          text: "İnceleme sistemi değiştirmedi; müdahale ayrı bir onay gerektirir.",
        },
      ],
    },
    {
      id: "action",
      title: outcome.hasSuccessfulApproval
        ? "Onay verildi. Sınırlı işlem uygulandı."
        : "Başarılı müdahale doğrulanamadı.",
      duration: 16,
      cues: [
        {
          label: "Yetkili onayı",
          text: outcome.hasSuccessfulApproval
            ? "Bu denemede, yetkilendirilmiş test programı işleme onay verdi."
            : "Bu arızaya bağlı başarılı onay ve işlem doğrulanamadı.",
        },
        {
          label: "Tek hedef",
          text: outcome.hasSuccessfulApproval
            ? "İzin yalnızca sample-api üzerindeki test hatasını temizlemek içindi."
            : "Hedef ve kapsam eşleşmeden müdahale yapılmış diyemeyiz.",
        },
        {
          label: "İşlemin uygulanması",
          text: outcome.hasSuccessfulApproval
            ? "Onaylı işlem, uygulamadaki test hatasını temizledi."
            : "Bir inceleme raporu, düzeltmenin gerçekleştiğini kanıtlamaz.",
        },
        {
          label: "İşlem sonrası",
          text: outcome.hasSuccessfulApproval
            ? "İşlem sonrası HTTP 200 görüldü; AI kendine yetki vermedi."
            : "Sonuç için işlem kaydı ve başarılı kontrol birlikte gerekir.",
        },
      ],
    },
    {
      id: "recovery",
      title: outcome.hasVerifiedRecovery
        ? "Yanıt geri geldi. İzleme de doğruladı."
        : "Toparlanmayı doğrulayan kayıt eksik.",
      duration: 16,
      cues: [
        {
          label: "Başarılı yanıt",
          text:
            outcome.afterStatus === 200
              ? "Yeni istek HTTP 200 aldı; uygulama yeniden yanıt veriyor."
              : "İşlem sonrası başarılı HTTP yanıtı doğrulanamadı.",
        },
        {
          label: "Ayrı kontrol",
          text: outcome.hasVerifiedRecovery
            ? "İzleme sistemi de ayrı kontrolde sağlıklı yanıt gördü."
            : "Ayrı ve ilgili bir sağlıklı toparlanma gözlemi eksik.",
        },
        {
          label: "Arızanın sonucu",
          text: outcome.hasVerifiedRecovery
            ? "Arıza kaydı, bu toparlanma gözlemiyle kapandı."
            : "Yalnızca kapanış durumu, düzelmeyi kanıtlamaz.",
        },
        {
          label: "Kanıtları incele",
          text: "Raporu, onayı ve sonucu artık özgün kanıtlarından inceleyebilirsin.",
        },
      ],
    },
  ];

  let start = 0;
  return chapters.map((chapter) => {
    const timed: FilmChapter = {
      ...chapter,
      start,
      cues: chapter.cues.map((cue, index) => ({
        ...cue,
        at: (chapter.duration * index) / chapter.cues.length,
      })),
    };
    start += chapter.duration;
    return timed;
  });
}

/** Seeking is deterministic; pausing and rendering never change the saved case. */
export function locateFilmTime(chapters: FilmChapter[], seconds: number) {
  if (chapters.length === 0)
    return { chapterIndex: 0, cueIndex: 0, localTime: 0, progress: 0 };
  const finalChapter = chapters[chapters.length - 1];
  const end = finalChapter.start + finalChapter.duration;
  const bounded = Math.max(
    0,
    Math.min(
      end,
      Number.isFinite(seconds) ? seconds : seconds === Infinity ? end : 0,
    ),
  );
  let chapterIndex = 0;
  while (
    chapterIndex < chapters.length - 1 &&
    bounded >= chapters[chapterIndex + 1].start
  )
    chapterIndex++;
  const chapter = chapters[chapterIndex];
  const localTime = Math.max(
    0,
    Math.min(chapter.duration, bounded - chapter.start),
  );
  let cueIndex = 0;
  while (
    cueIndex < chapter.cues.length - 1 &&
    localTime >= chapter.cues[cueIndex + 1].at
  )
    cueIndex++;
  return {
    chapterIndex,
    cueIndex,
    localTime,
    progress: chapter.duration > 0 ? localTime / chapter.duration : 0,
  };
}

export function formatFilmTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export const filmChapters = buildIntroFilm(recordedCase as RecordedCase);
export const filmDuration = filmChapters.reduce(
  (total, chapter) => total + chapter.duration,
  0,
);
