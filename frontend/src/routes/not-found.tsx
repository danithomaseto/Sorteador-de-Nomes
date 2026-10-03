import { ButtonLink } from "~/components/Button";
import { EmptyState } from "~/components/EmptyState";
import { PageLayout } from "~/components/layout/PageLayout";
import { APP_NAME } from "~/lib/config";

export function meta() {
  return [{ title: `Página não encontrada · ${APP_NAME}` }];
}

export default function NotFound() {
  return (
    <PageLayout>
      <div className="container">
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
      </div>
    </PageLayout>
  );
}
