const TOKEN_KEY = "eazo.id_token";

export const getToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token: string): void =>
  localStorage.setItem(TOKEN_KEY, token);

export const removeToken = (): void =>
  localStorage.removeItem(TOKEN_KEY);
