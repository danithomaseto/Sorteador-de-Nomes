import { Link } from "react-router";
import { ButtonLink } from "~/components/Button";
import { cx } from "~/components/cx";
import { DocLayout, FactList, type DocSection } from "~/components/layout/DocLayout";
import styles from "./content.module.css";
import { pageMeta } from "~/utils/seo";

export function meta() {
  return pageMeta({
    title: "Como funciona o sorteio",
    description:
      "Como o sorteio escolhe os vencedores: tudo acontece no seu navegador, com o gerador criptográfico do dispositivo, a mesma chance para cada participante e nenhuma inteligência artificial.",
    path: "/como-funciona",
  });
}

const SECTIONS: readonly DocSection[] = [
  { id: "passo-a-passo", title: "Passo a passo" },
  { id: "metodo", title: "O método" },
  { id: "regras", title: "Regras de cada rodada" },
  { id: "roletas", title: "As roletas" },
  { id: "garantias", title: "Garantias e limites" },
  { id: "dados", title: "Seus dados" },
];

const SUMMARY = [
  ["Participantes", "Você carrega a lista. Ninguém entra ou sai sem uma ação sua."],
  ["Regras", "Você define quantos vencedores e se pode haver repetição."],
  ["Chance", "Cada participante disponível tem a mesma probabilidade."],
  ["Inteligência artificial", "Nenhuma. Quem escolhe é o gerador aleatório do dispositivo."],
  ["Seus dados", "Ficam no navegador. Nenhum nome é enviado a servidores."],
  ["Registro", "Nada fica guardado. Exporte o resultado se precisar."],
] as const;

export default function HowItWorks() {
  return (
    <DocLayout
      title="Como funciona o sorteio"
      lead="O que acontece quando você clica em “Sortear”, o que o sistema garante e o que fica sob a responsabilidade de quem organiza."
      sections={SECTIONS}
      summary={<FactList facts={SUMMARY} />}
    >
      <section aria-labelledby="passo-a-passo-titulo" id="passo-a-passo">
        <h2 id="passo-a-passo-titulo">Passo a passo</h2>
        <ol className={styles.steps}>
          <li>
            <h3>A lista é congelada</h3>
            <p>
              Ao clicar em “Sortear”, a lista de participantes disponíveis é fixada, na ordem em que
              aparece.
            </p>
          </li>
          <li>
            <h3>O navegador escolhe as posições</h3>
            <p>
              O gerador de números aleatórios criptograficamente seguro do dispositivo (
              <code>crypto.getRandomValues</code>, da Web Crypto API), alimentado pelo sistema
              operacional, define as posições vencedoras.
            </p>
          </li>
          <li>
            <h3>A rodada é registrada</h3>
            <p>
              Quem estava em cada posição, na ordem do sorteio, com a data e a hora do seu
              dispositivo. A rodada aparece no histórico da sessão e não pode ser refeita.
            </p>
          </li>
          <li>
            <h3>Nada passa por um servidor</h3>
            <p>
              O site é um conjunto de arquivos que o navegador baixa uma vez. Depois disso, a lista,
              o sorteio e a exportação acontecem no seu dispositivo.
            </p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="metodo-titulo" id="metodo">
        <h2 id="metodo-titulo">O método</h2>
        <p>
          O embaralhamento de Fisher–Yates é como embaralhar um baralho de forma justa e tirar as
          primeiras cartas: todas as ordens possíveis têm a mesma probabilidade. Cada número
          aleatório passa por amostragem por rejeição, que elimina o pequeno viés que um simples
          resto de divisão criaria.
        </p>
        <p>
          Por que não <code>Math.random()</code>? Ele produz números bem distribuídos, mas não é
          projetado para ser imprevisível: em alguns navegadores, observar poucos resultados permite
          calcular os próximos. O gerador criptográfico não tem esse problema.
        </p>
      </section>

      <section aria-labelledby="regras-titulo" id="regras">
        <h2 id="regras-titulo">Regras de cada rodada</h2>
        <div
          className={styles.tableWrap}
          tabIndex={0}
          role="region"
          aria-label="Regras de cada rodada"
        >
          <table className={cx(styles.table, styles.rules)}>
            <thead>
              <tr>
                <th scope="col">Repetir na rodada</th>
                <th scope="col">Remover vencedores</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Não</td>
                <td>Sim</td>
                <td>
                  Ninguém aparece duas vezes, e quem ganhou fica de fora das próximas rodadas.
                </td>
              </tr>
              <tr>
                <td>Não</td>
                <td>Não</td>
                <td>
                  Ninguém aparece duas vezes, mas todos voltam a participar na rodada seguinte.
                </td>
              </tr>
              <tr>
                <td>Sim</td>
                <td>Não</td>
                <td>A mesma pessoa pode sair mais de uma vez (útil para vários prêmios).</td>
              </tr>
              <tr>
                <td>Sim</td>
                <td>Sim</td>
                <td>Pode haver repetição na rodada; depois, quem ganhou fica de fora.</td>
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

      <section aria-labelledby="roletas-titulo" id="roletas">
        <h2 id="roletas-titulo">As roletas</h2>
        <p>
          Os nomes que passam nas roletas são apenas visuais: os vencedores já foram definidos no
          momento do clique, e as roletas sempre param no resultado real. Com vários vencedores,
          elas giram juntas — 10 vencedores aparecem em 5 roletas com 2 faixas cada, na ordem do
          sorteio.
        </p>
        <p>
          Na revelação “um a um”, todos os vencedores da rodada também já estão definidos: revelar é
          só apresentar.
        </p>
      </section>

      <section aria-labelledby="garantias-titulo" id="garantias">
        <h2 id="garantias-titulo">Garantias e limites</h2>
        <div className={styles.columns}>
          <div>
            <h3>O sistema garante</h3>
            <ul>
              <li>
                A mesma probabilidade para cada participante disponível, com um gerador adequado
                para segurança.
              </li>
              <li>
                Rodadas numeradas, que não podem ser refeitas nem editadas: “Sortear novamente” cria
                uma nova rodada, visível no histórico.
              </li>
            </ul>
          </div>
          <div>
            <h3>Fica com quem organiza</h3>
            <ul>
              <li>
                O registro: como nada é guardado nem enviado, o serviço não consegue confirmar um
                resultado depois. Exporte em Excel, CSV, texto ou PDF.
              </li>
              <li>
                A transparência: quem organiza controla a lista e as rodadas. Em sorteios com
                público, sorteie em tela compartilhada (modo apresentação).
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="dados-titulo" id="dados">
        <h2 id="dados-titulo">Seus dados</h2>
        <p>
          Não pedimos cadastro, não recebemos sua lista e não guardamos seus resultados. Veja os
          detalhes em <Link to="/privacidade">Privacidade e termos de uso</Link>.
        </p>
        <div className={styles.end}>
          <ButtonLink to="/sorteio" variant="primary" size="lg" icon="shuffle">
            Criar sorteio
          </ButtonLink>
        </div>
      </section>
    </DocLayout>
  );
}
