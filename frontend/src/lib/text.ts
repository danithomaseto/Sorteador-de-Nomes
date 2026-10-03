/** Chave de busca para o filtro da lista: sem acentos e sem diferenciar maiúsculas.
 * Só serve para filtrar na tela; a chave de duplicidade oficial vem do servidor. */
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
}
