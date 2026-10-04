import { cx } from "~/components/cx";
import { PageLayout } from "~/components/layout/PageLayout";
import { APP_NAME, CONTACT_EMAIL, PRIVACY_MESSAGE } from "~/lib/config";
import styles from "./content.module.css";

export function meta() {
  return [
    { title: `Privacidade e termos de uso · ${APP_NAME}` },
    { name: "description", content: PRIVACY_MESSAGE },
  ];
}

const DATA_ROWS = [
  [
    "Lista de participantes, configurações, resultados e histórico",
    "Na memória desta aba do seu navegador",
    "Até você recarregar ou fechar a página, ou começar um novo sorteio",
  ],
  [
    "Arquivo importado (Excel ou CSV)",
    "Na memória do servidor, só durante a leitura",
    "Descartado ao fim da leitura; nunca é gravado",
  ],
  [
    "Texto colado ou nome digitado",
    "Na memória do servidor, só durante a verificação",
    "Descartado em seguida",
  ],
  [
    "Pedido de sorteio",
    "O servidor recebe apenas quantidades, nenhum nome",
    "Descartado em seguida",
  ],
  [
    "Pedido de exportação",
    "Na memória do servidor, só para gerar o arquivo",
    "Descartado assim que o arquivo é entregue a você",
  ],
  ["Endereço IP", "Transformado em um código irreversível para limitar abusos", "Alguns minutos"],
] as const;

export default function Privacy() {
  return (
    <PageLayout>
      <article className={cx("container", styles.page)}>
        <header className={styles.header}>
          <h1 className={styles.title}>Privacidade e termos de uso</h1>
          <p className={styles.lead}>{PRIVACY_MESSAGE}</p>
        </header>

        <section className={styles.section} aria-labelledby="dados">
          <h2 id="dados">O que acontece com os dados</h2>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label="O que acontece com os dados"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Dado</th>
                  <th scope="col">Onde fica</th>
                  <th scope="col">Por quanto tempo</th>
                </tr>
              </thead>
              <tbody>
                {DATA_ROWS.map(([data, where, howLong]) => (
                  <tr key={data}>
                    <td>{data}</td>
                    <td>{where}</td>
                    <td>{howLong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul>
            <li>Não há cadastro, login, banco de dados nem cookies.</li>
            <li>Não usamos ferramentas de análise de navegação, anúncios ou rastreadores.</li>
            <li>
              Os nomes não são enviados a outros serviços, não são usados para treinar inteligência
              artificial e não são vendidos.
            </li>
            <li>
              Fontes e arquivos do site são servidos pelo próprio site, sem serviços de terceiros.
            </li>
            <li>
              Os registros técnicos do servidor não contêm nomes, conteúdo de arquivos nem endereços
              IP.
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="direitos">
          <h2 id="direitos">Seus direitos</h2>
          <p>
            A Lei Geral de Proteção de Dados (LGPD) garante, entre outros, o direito de saber como
            seus dados são tratados e de pedir sua eliminação. Como o serviço não guarda os dados
            inseridos, não há informações armazenadas para consultar, corrigir ou apagar depois.
            Para descartar tudo durante o uso, feche a página ou clique em “Novo sorteio”.
          </p>
          <p>
            Se você incluir nomes de outras pessoas — por exemplo, de alunos ou colegas —, use-os
            apenas para a finalidade do sorteio.
          </p>
          {CONTACT_EMAIL ? (
            <p>
              Dúvidas sobre privacidade: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="termos">
          <h2 id="termos">Termos de uso</h2>
          <ul>
            <li>
              A ferramenta é oferecida para sortear nomes de forma aleatória. Quem organiza o
              sorteio é responsável pela lista de participantes, pelas regras escolhidas e pelo uso
              do resultado.
            </li>
            <li>
              Sorteios usados como promoção comercial — por exemplo, distribuição gratuita de
              prêmios a título de propaganda — podem exigir autorização prévia do Ministério da
              Fazenda (Lei nº 5.768/1971). Esta ferramenta não substitui essa autorização.
            </li>
            <li>
              Não use o serviço para fins ilegais nem de forma que prejudique seu funcionamento (por
              exemplo, automatizando grandes volumes de requisições).
            </li>
            <li>
              O serviço é fornecido como está. Exporte o resultado se precisar de um registro: como
              nada é guardado, não é possível recuperar um sorteio depois.
            </li>
            <li>
              Estes termos podem ser atualizados; a versão vigente estará sempre nesta página.
            </li>
          </ul>
          <p className={styles.note}>Versão de outubro de 2026.</p>
        </section>
      </article>
    </PageLayout>
  );
}
