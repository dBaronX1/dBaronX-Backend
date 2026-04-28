import env from "@/config/env";

const BASE_URL = env.api.fastapiBaseUrl;

interface FastApiOptions extends RequestInit {
  token?: string;
}

async function fastapiRequest<T>(path: string, options: FastApiOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData?.message || `FastAPI error: ${res.status}`);
  }
  return res.json();
}

export const fastapi = {
  ads: {
    list: (params?: { category?: string; country?: string; city?: string }, token?: string) => {
      const query = new URLSearchParams(params as any).toString();
      return fastapiRequest<any[]>(`/ads${query ? `?${query}` : ""}`, { token });
    },
    startWatch: (adId: string | number, token?: string) =>
      fastapiRequest<any>(`/ads/${adId}/watch/start`, { method: "POST", token }),
    confirmWatch: (adId: string | number, captchaToken: string, token?: string) =>
      fastapiRequest<any>(`/ads/${adId}/watch/confirm`, {
        method: "POST",
        body: JSON.stringify({ captcha_token: captchaToken }),
        token,
      }),
  },

  ai: {
    generateStory: (prompt: string, genre: string, token?: string) =>
      fastapiRequest<any>("/ai/stories/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, genre }),
        token,
      }),
    recommendations: (userId: string, token?: string) =>
      fastapiRequest<any[]>(`/ai/recommendations/${userId}`, { token }),
  },
};

export default fastapi;
