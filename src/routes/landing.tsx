import { useRef } from "react";
import { Link } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import {
  FigureVisual,
  FormatsVisual,
  ReelsVisual,
  ScreenVisual,
  SheetVisual,
} from "~/features/marketing/FeatureVisuals";
import { Photo } from "~/features/marketing/Photo";
import { LANDING_PHOTOS } from "~/features/marketing/photos";
import { SlotDigit } from "~/features/marketing/Motion";
import { ResultPreview } from "~/features/marketing/ResultPreview";
import { useSession } from "~/features/session/SessionProvider";
import { APP_NAME, SITE_DESCRIPTION } from "~/config";
import { countLabel } from "~/utils/format";
import { useRevealOnScroll } from "~/utils/motion";
import styles from "./landing.module.css";
import { pageMeta } from "~/utils/seo";

const DESCRIPTION =
  "Cole a lista ou importe do Excel, escolha quantos vencedores e mostre as roletas em tela cheia. Tudo acontece no seu navegador.";

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
    title: "Monte a lista",
    text: "Digite os nomes, cole de uma planilha ou importe um arquivo .xlsx, .xls ou .csv. Repetidos e linhas vazias são tratados na hora.",
  },
  {
    title: "Defina as regras",
    text: "Quantos vencedores, se alguém pode sair duas vezes e se quem ganhou fica de fora das próximas rodadas.",
  },
  {
    title: "Sorteie na frente de todos",
    text: "As roletas giram e param nos vencedores. Apresente em tela cheia ou num telão e exporte o resultado.",
  },
];

const SPECS = [
  ["Gerador", "Criptográfico do próprio dispositivo (Web Crypto)"],
  ["Método", "Fisher–Yates com amostragem por rejeição"],
  ["Chance", "A mesma para cada participante disponível"],
  ["Inteligência artificial", "Nenhuma"],
  ["Dados enviados", "Nenhum — o navegador bloqueia qualquer envio"],
  ["Cadastro e cookies", "Não existem"],
] as const;

export default function Landing() {
  const { state } = useSession();
  const total = state.participants.length;
  const cta = total > 0 ? "Continuar sorteio" : "Criar sorteio";
  const pageRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(pageRef);

  return (
    <PageLayout>
      <div ref={pageRef}>
        <section className={cx("container", styles.hero)} aria-labelledby="titulo">
          <p className={styles.kicker}>Sorteio de nomes online · grátis e sem cadastro</p>
          <h1 id="titulo" className={styles.title}>
            Sorteio de nomes, da planilha ao telão.
          </h1>
          <div className={styles.heroFoot}>
            <p className={styles.lead}>{DESCRIPTION}</p>
            <div className={styles.heroActions}>
              <div className={styles.ctas}>
                <ButtonLink
                  to="/sorteio"
                  variant="primary"
                  size="lg"
                  icon="shuffle"
                  className={styles.cta}
                  viewTransition
                >
                  {cta}
                </ButtonLink>
                <ButtonLink to="/como-funciona" size="lg" viewTransition>
                  Como funciona
                </ButtonLink>
              </div>
              <p className={styles.reassure}>
                <Icon name="lock" size={16} />
                <span>
                  Nada é enviado nem fica guardado.
                  {total > 0
                    ? ` Sua lista tem ${countLabel(total, "participante", "participantes")} nesta aba.`
                    : ""}
                </span>
              </p>
            </div>
          </div>
          <ResultPreview />
        </section>

        <section className={cx("container", styles.section, styles.split)} aria-labelledby="passos">
          <h2 id="passos" className={styles.sectionTitle} data-reveal>
            Do nome ao vencedor em três passos.
          </h2>
          <ol className={styles.steps} data-reveal="stagger">
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <SlotDigit value={index + 1} className={styles.stepNumber} />
                <div className={styles.stepBody}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={cx("container", styles.section)} aria-labelledby="recursos">
          <div className={styles.sectionHead} data-reveal>
            <h2 id="recursos" className={styles.sectionTitle}>
              Tudo o que um sorteio pede.
            </h2>
            <p className={styles.sectionLead}>
              Da rifa da escola ao brinde da confraternização e à premiação do evento.
            </p>
          </div>
          <ul role="list" className={styles.bento} data-reveal="stagger">
            <li className={cx(styles.tile, styles.tileWide)}>
              <div className={styles.tileText}>
                <h3>Vários vencedores de uma vez</h3>
                <p>Uma roleta por vencedor, todas girando juntas. Com 10, são 5 roletas com 2.</p>
              </div>
              <ReelsVisual />
            </li>
            <li className={styles.tile}>
              <div className={styles.tileText}>
                <h3>Direto da planilha</h3>
                <p>Excel e CSV com várias colunas: você escolhe a dos nomes e revisa antes.</p>
              </div>
              <SheetVisual />
            </li>
            <li className={styles.tile}>
              <div className={styles.tileText}>
                <h3>Telão e projetor</h3>
                <p>Uma segunda janela para o projetor enquanto você controla pelo notebook.</p>
              </div>
              <ScreenVisual />
            </li>
            <li className={styles.tile}>
              <FigureVisual value={50000} unit="nomes por sorteio, sem travar a página" />
              <div className={styles.tileText}>
                <h3>Listas grandes</h3>
                <p>Lidas em segundo plano e exibidas em colunas que rolam sem engasgar.</p>
              </div>
            </li>
            <li className={styles.tile}>
              <FigureVisual value={0} unit="nomes enviados a servidores" />
              <div className={styles.tileText}>
                <h3>Privado por construção</h3>
                <p>Sem cadastro, sem banco de dados e sem cookies. A lista existe só nesta aba.</p>
              </div>
            </li>
            <li className={styles.tile}>
              <FormatsVisual />
              <div className={styles.tileText}>
                <h3>Resultado para guardar</h3>
                <p>Copie ou exporte em Excel, CSV, texto, PDF ou imagem para compartilhar.</p>
              </div>
            </li>
          </ul>
        </section>

        {LANDING_PHOTOS.length > 0 ? (
          <section className={cx("container", styles.section)} aria-labelledby="em-uso">
            <h2 id="em-uso" className={styles.sectionTitle}>
              Em uso.
            </h2>
            <div className={styles.photos}>
              {LANDING_PHOTOS.map((photo) => (
                <Photo key={photo.src} photo={photo} />
              ))}
            </div>
          </section>
        ) : null}

        <section className={cx("container", styles.section)} aria-labelledby="confianca">
          <div className={styles.statement} data-reveal>
            <h2 id="confianca" className={styles.statementTitle}>
              O resultado é decidido antes de as roletas girarem — e nunca sai do seu navegador.
            </h2>
            <Link to="/como-funciona" className={styles.textLink} viewTransition>
              Ver os detalhes do sorteio
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>
          <dl className={styles.specs} data-reveal="stagger">
            {SPECS.map(([term, description]) => (
              <div key={term} className={styles.spec}>
                <dt>{term}</dt>
                <dd>{description}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={cx("container", styles.final)} aria-labelledby="comecar">
          <h2 id="comecar" className={styles.finalTitle} data-reveal>
            Tem uma lista pronta?
          </h2>
          <div className={styles.finalAction} data-reveal>
            <p className={styles.sectionLead}>Cole os nomes e sorteie em menos de um minuto.</p>
            <ButtonLink
              to="/sorteio"
              variant="primary"
              size="lg"
              icon="shuffle"
              className={styles.cta}
              viewTransition
            >
              {cta}
            </ButtonLink>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
