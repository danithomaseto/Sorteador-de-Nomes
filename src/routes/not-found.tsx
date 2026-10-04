import { ButtonLink } from "~/components/Button";
import { EmptyState } from "~/components/EmptyState";
import { PageLayout } from "~/components/layout/PageLayout";
import { pageMeta } from "~/utils/seo";

export function meta() {
  return pageMeta({ title: "Página não encontrada", path: "/", indexable: false });
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
