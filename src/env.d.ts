/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** E-mail de contato exibido na política de privacidade (definir antes do lançamento). */
  readonly VITE_CONTACT_EMAIL?: string;
  /** Endereço público do site (ex.: https://sorteia.com.br), sem barra no fim. */
  readonly VITE_SITE_URL?: string;
}
