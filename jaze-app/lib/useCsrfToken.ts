import { useEffect, useState } from "react";

export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfError, setCsrfError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToken = async () => {
    setLoading(true);
    setCsrfError(null);
    try {
      const res = await fetch("/api/csrf", { credentials: "same-origin" });
      if (!res.ok) {
        setCsrfError("Impossible d'initialiser la protection CSRF");
        return;
      }
      const data = await res.json();
      if (typeof data?.token === "string") {
        setCsrfToken(data.token);
      } else {
        setCsrfError("Token CSRF non reçu");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur CSRF";
      setCsrfError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return { csrfToken, csrfError, loading, refreshCsrfToken: fetchToken };
}
