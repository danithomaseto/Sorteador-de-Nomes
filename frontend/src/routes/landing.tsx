import { Link } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { Icon, type IconName } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import { ResultPreview } from "~/features/marketing/ResultPreview";
import { useSession } from "~/features/session/SessionProvider";
import { APP_NAME, PRIVACY_MESSAGE } from "~/lib/config";
import { countLabel } from "~/lib/format";
import styles from "./landing.module.css";

const TITLE = "Sorteios simples. Resultados justos.";
const DESCRIPTION =
  "Adicione seus participantes, escolha quantos serão sorteados e deixe o resto com o sistema.";

export function meta() {
  return [
    { title: `${APP_NAME} — sorteio de nomes online, sem cadastro` },
    { name: "description", content: `${DESCRIPTION} Sem cadastro e sem guardar seus dados.` },
    { property: "og:title", content: `${APP_NAME} — ${TITLE}` },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:type", content: "website" },
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
    text: "Veja o resultado na hora ou apresente em tela cheia. Exporte em Excel ou CSV se precisar de registro.",
  },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "upload",
    title: "Importar participantes",
    text: "Planilhas .xlsx e arquivos .csv com várias colunas: você escolhe a coluna dos nomes e revisa antes de adicionar. Linhas vazias e problemas são apontados.",
  },
  {
    icon: "list",
    title: "Sorteios múltiplos",
    text: "Sorteie 1, 10 ou mil vencedores de uma vez, em várias rodadas. Cada rodada fica no histórico da sessão e não pode ser refeita.",
  },
  {
    icon: "check-circle",
    title: "Sem repetição",
    text: "Ninguém aparece duas vezes no mesmo resultado e, se você quiser, quem ganhou fica de fora das próximas rodadas.",
  },
  {
    icon: "monitor",
    title: "Modo apresentação",
    text: "Tela cheia para telão, TV ou projetor, com revelação um a um e atalhos de teclado.",
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
        <h2 id="recursos" className="visually-hidden">
          Recursos
        </h2>
        <ul role="list" className={styles.features}>
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={feature.icon} size={22} />
              </span>
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
              números aleatórios criptográfico do sistema operacional. Cada participante disponível
              tem a mesma chance.
            </li>
            <li>
              <strong>Sem inteligência artificial.</strong> Nenhuma IA escolhe, sugere ou influencia
              vencedores.
            </li>
            <li>
              <strong>Sem armazenamento.</strong> Não há cadastro, banco de dados nem cookies. A
              lista existe só enquanto a página estiver aberta.
            </li>
          </ul>
          <Link to="/como-funciona" className={styles.trustLink}>
            Ver os detalhes do sorteio →
          </Link>
        </div>
      </section>

      <section className={cx("container", styles.final)} aria-labelledby="comecar">
        <h2 id="comecar" className={styles.sectionTitle}>
          Pronto para sortear?
        </h2>
        <ButtonLink to="/sorteio" variant="primary" size="lg" icon="shuffle">
          {hasSession ? "Continuar sorteio" : "Criar sorteio"}
        </ButtonLink>
      </section>
    </PageLayout>
  );
}
