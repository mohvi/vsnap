// Painel "Mock Data" escreve utilizadores fake na base de dados real —
// só fica disponível em desenvolvimento ou com activação explícita.
export const ENABLE_MOCK = import.meta.env.DEV || import.meta.env.REACT_APP_ENABLE_MOCK === 'true';

export const APP_DOWNLOAD_URL =
  import.meta.env.REACT_APP_APP_DOWNLOAD_URL ||
  'https://play.google.com/store/apps/details?id=mz.votasnap.app';

// Snaps (moeda interna) — devem coincidir com os valores usados nas Cloud Functions.
export const PARTICIPATION_SNAPS = 5;
export const WINNER_SNAPS = 50;

export const DAY_MS = 24 * 60 * 60 * 1000;
