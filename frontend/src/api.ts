export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public kind:
      | "network"
      | "timeout"
      | "server"
      | "response"
      | "request"
      | "cancelled" = "request",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const unavailable =
  "Yönetim hizmetine ulaşılamıyor. Bağlantını kontrol edip yeniden deneyebilirsin.";
const uncertain =
  "İşlemin sonucu doğrulanamadı. İşlem sunucuda tamamlanmış olabilir; yeniden denemeden önce işlem geçmişini kontrol et.";

function responseMessage(status: number, path: string, message?: string) {
  if (status === 401)
    return path === "/auth/login"
      ? "Kullanıcı adı veya şifre hatalı. Bilgilerini kontrol edip tekrar dene."
      : "Oturumun sona erdi. Devam etmek için tekrar giriş yap.";
  if (status === 403)
    return "Bu işlem için oturum doğrulanamadı veya yetkin bulunmuyor. Sayfayı yenileyip tekrar giriş yap.";
  if (status === 422)
    return "Girilen bilgiler uygun değil. Zorunlu alanları ve değerleri kontrol et.";
  if (status === 413)
    return "Gönderilen veri çok büyük. Daha kısa bir içerikle tekrar dene.";
  if (status === 429)
    return message || "Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.";
  if (status === 404)
    return "İstenen kayıt bulunamadı. Listeyi yenileyip tekrar seç.";
  return message || "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar dene.";
}

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  csrf?: string,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);
  const readOnly = ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  try {
    const response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.status >= 500)
      throw new ApiError(
        readOnly ? unavailable : uncertain,
        response.status,
        "server",
      );
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new ApiError(
        !response.ok && response.status < 500
          ? responseMessage(response.status, path)
          : readOnly
            ? unavailable
            : uncertain,
        response.status,
        "response",
      );
    let data;
    try {
      data = await response.json();
    } catch {
      if (controller.signal.aborted)
        throw new DOMException("Timeout", "AbortError");
      throw new ApiError(
        readOnly
          ? "Yönetim hizmetinden geçerli bir yanıt alınamadı. Yeniden bağlantı kurmayı dene."
          : uncertain,
        response.status,
        "response",
      );
    }
    if (!response.ok)
      throw new ApiError(
        responseMessage(
          response.status,
          path,
          typeof data?.error?.message === "string"
            ? data.error.message
            : undefined,
        ),
        response.status,
      );
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted && !timedOut)
      throw new ApiError(
        readOnly ? "Bağlantı kontrolü iptal edildi." : uncertain,
        0,
        "cancelled",
      );
    if (timedOut)
      throw new ApiError(
        readOnly
          ? "Yönetim hizmeti zamanında yanıt vermedi. Biraz sonra yeniden deneyebilirsin."
          : uncertain,
        0,
        "timeout",
      );
    throw new ApiError(readOnly ? unavailable : uncertain, 0, "network");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
