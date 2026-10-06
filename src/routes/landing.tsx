import { Link } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import { ResultPreview } from "~/features/marketing/ResultPreview";
import { useSession } from "~/features/session/SessionProvider";
import { APP_NAME, PRIVACY_MESSAGE, SITE_DESCRIPTION } from "~/config";
import { countLabel } from "~/utils/format";
import styles from "./landing.module.css";
import { pageMeta } from "~/utils/seo";

const DESCRIPTION =
  "Cole ou importe a lista, escolha quantos vencedores e sorteie. Tudo acontece no seu navegador.";

export function meta() {
  return [
    ...pageMeta({ path: "/" }),
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: APP_NAME,
        description: SITE_DESCRIPTION,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Qualquer navegador atual",
        inLanguage: "pt-BR",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
      },
    },
  ];
}

const STEPS = [
  {
    title: "Adicione os participantes",
    text: "Digite os nomes, cole uma lista ou importe uma planilha do Excel ou um arquivo CSV.",
  },
  {
    title: "Escolha as regras",
    text: "Quantos vencedores, se alguém pode sair duas vezes e se quem ganhou sai das próximas rodadas.",
  },
  {
    title: "Sorteie",
    text: "As roletas giram e param nos vencedores. Apresente em tela cheia e exporte em Excel, CSV, texto, PDF ou imagem.",
  },
];

const FEATURES: { title: string; text: string }[] = [
  {
    title: "Planilhas e listas coladas",
    text: "Excel (.xlsx e .xls) e .csv com várias colunas: você escolhe a coluna dos nomes e revisa antes de adicionar. Duplicados e linhas vazias são tratados.",
  },
  {
    title: "Vários vencedores de uma vez",
    text: "Com 10 vencedores, 10 nomes param nas roletas ao mesmo tempo. Cada rodada fica no histórico da sessão e não pode ser refeita.",
  },
  {
    title: "Sem repetição",
    text: "Ninguém aparece duas vezes no mesmo resultado e, se você quiser, quem ganhou fica de fora das próximas rodadas.",
  },
  {
    title: "Para telão e projetor",
    text: "Tela cheia, revelação um a um e atalhos de teclado. O telão abre numa segunda janela enquanto você controla pelo notebook.",
  },
];

export default function Landing() {
  const { state } = useSession();
  const hasSession = state.participants.length > 0;

  return (
    <PageLayout>
      <section className={cx("container", styles.hero)} aria-labelledby="titulo">
        <div className={styles.heroText}>
          <h1 id="titulo" className={styles.title}>
            Sorteios simples.
            <br />
            Resultados justos.
          </h1>
          <p className={styles.lead}>{DESCRIPTION}</p>
          <div className={styles.ctas}>
            <ButtonLink to="/sorteio" variant="primary" size="xl" icon="shuffle">
              {hasSession ? "Continuar sorteio" : "Criar sorteio"}
            </ButtonLink>
            <ButtonLink to="/como-funciona" variant="ghost" size="lg">
              Como funciona o sorteio
            </ButtonLink>
          </div>
          {hasSession ? (
            <p className={styles.note}>
              Sua lista tem {countLabel(state.participants.length, "participante", "participantes")}{" "}
              nesta aba.
            </p>
          ) : null}
          <p className={styles.privacy}>
            <Icon name="lock" size={18} />
            <span>{PRIVACY_MESSAGE} Sem cadastro.</span>
          </p>
        </div>
        <ResultPreview />
      </section>

      <section className={cx("container", styles.section)} aria-labelledby="como-funciona">
        <h2 id="como-funciona" className={styles.sectionTitle}>
          Como funciona
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={cx(styles.stepNumber, "numeric")} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={cx("container", styles.section)} aria-labelledby="recursos">
        <h2 id="recursos" className={styles.sectionTitle}>
          O que você pode fazer
        </h2>
        <ul role="list" className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={cx("container", styles.section)} aria-labelledby="confianca">
        <div className={styles.trust}>
          <h2 id="confianca" className={styles.sectionTitle}>
            Transparente do começo ao fim
          </h2>
          <ul role="list" className={styles.trustList}>
            <li>
              <strong>Aleatório de verdade.</strong> Os vencedores são escolhidos pelo gerador de
              números aleatórios criptográfico do seu dispositivo. Cada participante disponível tem
              a mesma chance.
            </li>
            <li>
              <strong>Sem inteligência artificial.</strong> Nenhuma IA escolhe, sugere ou influencia
              vencedores.
            </li>
            <li>
              <strong>Nada sai do seu navegador.</strong> A lista, o sorteio e a exportação
              acontecem no seu dispositivo. Sem cadastro, banco de dados nem cookies: a lista existe
              só enquanto a página estiver aberta.
            </li>
          </ul>
          <Link to="/como-funciona" className={styles.trustLink}>
            Ver os detalhes do sorteio →
          </Link>
        </div>
      </section>

      <section className={cx("container", styles.final)} aria-labelledby="comecar">
        <div>
          <h2 id="comecar" className={styles.sectionTitle}>
            Sem cadastro, sem instalar nada
          </h2>
          <p className={styles.finalText}>Cole a lista e sorteie em menos de um minuto.</p>
        </div>
        <ButtonLink to="/sorteio" variant="primary" size="lg" icon="shuffle">
          {hasSession ? "Continuar sorteio" : "Criar sorteio"}
        </ButtonLink>
      </section>
    </PageLayout>
  );
}
