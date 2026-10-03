import { useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { EmptyState } from "~/components/EmptyState";
import { PageLayout } from "~/components/layout/PageLayout";
import type { RevealState } from "~/features/rounds/useDrawRound";
import { ResultView } from "~/features/rounds/ResultView";
import { useSession } from "~/features/session/SessionProvider";
import { APP_NAME } from "~/lib/config";
import styles from "./round.module.css";

export { RouteErrorBoundary as ErrorBoundary } from "~/components/layout/RouteErrorBoundary";

export function meta() {
  return [{ title: `Resultado · ${APP_NAME}` }];
}

function isRevealState(value: unknown): value is RevealState {
  return typeof value === "object" && value !== null && "reveal" in value;
}

export default function RoundPage() {
  const { number } = useParams();
  const { state } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const round = state.rounds.find((r) => String(r.number) === number);
  const fresh = isRevealState(location.state);

  // Depois de revelado, voltar/avançar no navegador não repete a animação.
  const onRevealFinished = useCallback(() => {
    void navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate]);

  return (
    <PageLayout>
      <div className={cx("container", styles.page)}>
        {round ? (
          <ResultView
            key={round.number}
            round={round}
            fresh={fresh}
            onRevealFinished={onRevealFinished}
          />
        ) : (
          <EmptyState
            icon="history"
            title="Este resultado não está mais disponível"
            headingLevel={2}
            actions={
              <ButtonLink to="/sorteio" variant="primary">
                Ir para o sorteio
              </ButtonLink>
            }
          >
            Os dados do sorteio ficam apenas durante a sessão: ao recarregar ou fechar a página, a
            lista e os resultados são descartados. Se exportou o resultado, ele está no arquivo
            baixado.
          </EmptyState>
        )}
      </div>
    </PageLayout>
  );
}
