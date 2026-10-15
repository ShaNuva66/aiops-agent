export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  csrf?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(
      "Sisteme şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.",
      response.status,
    );
  }
  const data = await response.json();
  if (response.status >= 500) {
    throw new ApiError(
      "Sisteme şu anda ulaşılamıyor. Otomatik olarak yeniden deneniyor.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      data.error?.message || "İşlem tamamlanamadı.",
      response.status,
    );
  return data;
}
