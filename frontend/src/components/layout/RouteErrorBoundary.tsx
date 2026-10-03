import { useEffect } from "react";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { Button, ButtonLink } from "../Button";
import { EmptyState } from "../EmptyState";
import { PageLayout } from "./PageLayout";

/**
 * Erro em uma tela. Fica no nível da rota: o provedor da sessão (na raiz) continua montado,
 * então a lista do usuário não se perde.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    // Só no console do próprio navegador; nada é enviado a serviços externos.
    if (!notFound) console.error(error);
  }, [error, notFound]);

  return (
    <PageLayout>
      <div className="container">
        {notFound ? (
          <EmptyState
            icon="search"
            title="Página não encontrada"
            headingLevel={2}
            actions={
              <ButtonLink to="/" variant="primary">
                Ir para o início
              </ButtonLink>
            }
          >
            O endereço pode estar incorreto ou a página não existe mais.
          </EmptyState>
        ) : (
          <EmptyState
            icon="alert"
            title="Algo deu errado nesta tela"
            headingLevel={2}
            actions={
              <>
                <Button
                  variant="primary"
                  onClick={() => {
                    void navigate(".", { replace: true });
                  }}
                >
                  Tentar novamente
                </Button>
                <ButtonLink to="/sorteio">Voltar ao sorteio</ButtonLink>
              </>
            }
          >
            Seus participantes e resultados continuam nesta aba. Tente novamente.
          </EmptyState>
        )}
      </div>
    </PageLayout>
  );
}
