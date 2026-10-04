/** Pede tela cheia dentro do clique do usuário (exigência dos navegadores). Falhas são ignoradas:
 * no iPhone, por exemplo, só vídeos entram em tela cheia — o modo apresentação ocupa a tela toda. */
export function requestFullscreen(): void {
  const root = document.documentElement;
  if (document.fullscreenElement || typeof root.requestFullscreen !== "function") return;
  root.requestFullscreen().catch(() => undefined);
}
