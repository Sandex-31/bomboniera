import type { Thesis } from '../types';

/** TODO: replace every field with the real thesis content. */
export const thesis: Thesis = {
  title: 'TODO — Titolo della tesi',
  subtitle: 'Tesi di Laurea Triennale in Informatica',
  supervisor: 'TODO: Relatore',
  abstract:
    'TODO: abstract reale (5–8 righe). Descrivi il problema affrontato, l’approccio scelto e il risultato ottenuto, in un linguaggio comprensibile anche a chi non studia informatica — questa pagina la leggeranno soprattutto loro.',
  steps: [
    {
      label: 'Problema',
      body: 'TODO: qual era la domanda di partenza e perché valeva la pena rispondere.',
    },
    {
      label: 'Ricerca',
      body: 'TODO: stato dell’arte, letteratura letta, approcci esistenti e loro limiti.',
    },
    {
      label: 'Sviluppo',
      body: 'TODO: cosa è stato costruito, con quali scelte progettuali e quali compromessi.',
    },
    {
      label: 'Testing',
      body: 'TODO: come è stato validato — dataset, metriche, benchmark, utenti.',
    },
    {
      label: 'Risultato',
      body: 'TODO: cosa è emerso, cosa funziona, cosa resta aperto per il futuro.',
    },
  ],
  tech: ['TODO', 'TODO', 'TODO'],
  architecture: [
    'TODO: componente 1 — ruolo nel sistema',
    'TODO: componente 2 — ruolo nel sistema',
    'TODO: componente 3 — ruolo nel sistema',
  ],
  results: [
    'TODO: risultato misurabile 1',
    'TODO: risultato misurabile 2',
  ],
  media: [{ src: 'media/thesis-1.png', alt: 'Schema dell’architettura della tesi' }],
  // pdf: 'media/tesi.pdf',
  // repo: 'https://github.com/',
};
