import { useEffect, useState } from "react";
import { api, type Limits } from "./api/client";

/** Valores padrão do servidor, usados até a resposta chegar (ou se ela falhar). */
export const DEFAULT_LIMITS: Limits = {
  max_participants: 50_000,
  max_round_quantity: 10_000,
  max_name_length: 120,
  max_draw_name_length: 100,
  max_upload_bytes: 5 * 1024 * 1024,
  max_text_chars: 2_000_000,
  max_export_rounds: 1_000,
};

let request: Promise<Limits> | null = null;

export function useLimits(): Limits {
  const [limits, setLimits] = useState(DEFAULT_LIMITS);
  useEffect(() => {
    let active = true;
    request ??= api.limits().catch(() => {
      request = null;
      return DEFAULT_LIMITS;
    });
    void request.then((value) => {
      if (active) setLimits(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return limits;
}
