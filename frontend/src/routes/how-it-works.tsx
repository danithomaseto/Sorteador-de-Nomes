import { Link } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { Icon } from "~/components/Icon";
import { PageLayout } from "~/components/layout/PageLayout";
import { APP_NAME } from "~/lib/config";
import styles from "./content.module.css";

export function meta() {
  return [
    { title: `Como funciona o sorteio · ${APP_NAME}` },
    {
      name: "description",
      content:
        "Como o sorteio escolhe os vencedores: gerador criptográfico do sistema operacional, mesma chance para cada participante disponível e nenhuma inteligência artificial.",
    },
  ];
}

export default function HowItWorks() {
  return (
    <PageLayout>
      <article className={cx("container", styles.page)}>
        <header className={styles.header}>
          <h1 className={styles.title}>Como funciona o sorteio</h1>
          <p className={styles.lead}>
            O que acontece quando você clica em “Sortear” — e o que o sistema garante e não garante.
          </p>
        </header>

        <ul className={styles.summary} aria-label="Em resumo">
          {[
            "Você carrega os participantes. O sistema não adiciona nem remove ninguém sem uma ação sua.",
            "Você define quantos serão sorteados e as regras da rodada.",
            "Os vencedores são escolhidos por um processo aleatório: cada participante disponível tem a mesma chance.",
            "Nenhuma inteligência artificial escolhe, sugere ou influencia vencedores.",
            "Nada fica guardado: a lista e os resultados existem só enquanto a página estiver aberta.",
          ].map((item) => (
            <li key={item}>
              <Icon name="check" size={18} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <section className={styles.section} aria-labelledby="passo-a-passo">
          <h2 id="passo-a-passo">Passo a passo</h2>
          <ol>
            <li>
              Ao clicar em “Sortear”, o navegador congela a lista de participantes disponíveis, na
              ordem em que aparecem.
            </li>
            <li>
              O navegador envia ao servidor apenas{" "}
              <strong>quantas pessoas estão disponíveis</strong> e{" "}
              <strong>quantas serão sorteadas</strong>. Nenhum nome é enviado para sortear.
            </li>
            <li>
              O servidor escolhe as posições vencedoras com o gerador de números aleatórios
              criptograficamente seguro do sistema operacional (módulo <code>secrets</code> do
              Python) e devolve as posições, na ordem do sorteio, com a data e a hora oficiais da
              rodada.
            </li>
            <li>
              O navegador mostra quem estava em cada posição. Essa é a rodada registrada no
              histórico.
            </li>
          </ol>
          <p>
            O método é o embaralhamento de Fisher–Yates: é como embaralhar um baralho de forma justa
            e tirar as primeiras cartas. Todas as ordens possíveis têm a mesma probabilidade, e o
            gerador usado não permite prever o próximo resultado a partir dos anteriores.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="regras">
          <h2 id="regras">As regras de cada rodada</h2>
          <div
            className={styles.tableWrap}
            tabIndex={0}
            role="region"
            aria-label="Regras de cada rodada"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Repetir na mesma rodada</th>
                  <th scope="col">Remover vencedores</th>
                  <th scope="col">O que acontece</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Não</td>
                  <td>Sim</td>
                  <td>
                    Ninguém aparece duas vezes no resultado, e quem ganhou fica de fora das próximas
                    rodadas.
                  </td>
                </tr>
                <tr>
                  <td>Não</td>
                  <td>Não</td>
                  <td>
                    Ninguém aparece duas vezes no resultado, mas todos voltam a participar na rodada
                    seguinte.
                  </td>
                </tr>
                <tr>
                  <td>Sim</td>
                  <td>Não</td>
                  <td>
                    A mesma pessoa pode sair mais de uma vez no mesmo resultado (útil para vários
                    prêmios).
                  </td>
                </tr>
                <tr>
                  <td>Sim</td>
                  <td>Sim</td>
                  <td>
                    Pode haver repetição dentro da rodada; depois, quem ganhou fica de fora das
                    próximas.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Cada entrada da lista é uma chance. Se o mesmo nome aparecer duas vezes, ele conta duas
            vezes — por isso avisamos sobre nomes repetidos, que podem ser pessoas diferentes ou a
            mesma pessoa cadastrada em dobro.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="animacao">
          <h2 id="animacao">A animação</h2>
          <p>
            A animação com nomes passando é apenas visual. Os vencedores já foram definidos no
            momento em que você clicou em “Sortear”; a animação sempre termina no resultado real. Na
            revelação “um a um”, todos os vencedores da rodada também já foram definidos — revelar é
            só apresentar.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="limites">
          <h2 id="limites">O que garantimos e o que não garantimos</h2>
          <ul>
            <li>
              Garantimos que cada participante disponível tem a mesma probabilidade de ser
              escolhido, com um gerador de números aleatórios adequado para segurança.
            </li>
            <li>
              As rodadas são numeradas e não podem ser refeitas ou editadas: “Sortear novamente”
              cria uma nova rodada, visível no histórico da sessão.
            </li>
            <li>
              Como nada é guardado, o serviço não consegue confirmar um resultado depois. O registro
              é o arquivo que você exportar (Excel ou CSV), com a data e a hora oficiais de cada
              rodada.
            </li>
            <li>
              Quem organiza controla a lista e pode fazer quantas rodadas quiser. Para sorteios com
              público, faça a rodada em tela compartilhada (modo apresentação) e exporte o
              resultado.
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="privacidade">
          <h2 id="privacidade">E os meus dados?</h2>
          <p>
            Não pedimos cadastro e não guardamos sua lista nem seus resultados. Veja os detalhes em{" "}
            <Link to="/privacidade">Privacidade e termos de uso</Link>.
          </p>
        </section>

        <div>
          <ButtonLink to="/sorteio" variant="primary" size="lg" icon="shuffle">
            Criar sorteio
          </ButtonLink>
        </div>
      </article>
    </PageLayout>
  );
}
