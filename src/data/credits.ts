import type { CreditBlock, CreditGroup } from '../types';

/** TODO: replace with the real acknowledgements. Keep it short and honest. */
export const credits: CreditBlock[] = [
  {
    id: 'intro',
    body: 'Nessuno arriva in fondo da solo. Questa è la parte del progetto che non si compila.',
    emphasis: true,
  },
  {
    id: 'famiglia',
    heading: 'Alla mia famiglia',
    body: 'TODO: ringraziamento alla famiglia — chi ha creduto in questa scelta prima che avesse un senso.',
  },
  {
    id: 'amici',
    heading: 'Ai miei amici',
    body: 'TODO: ringraziamento agli amici — le sessioni di studio, le nottate, le risate fuori tempo massimo.',
  },
  {
    id: 'compagni',
    heading: 'Ai compagni di corso',
    body: 'TODO: ringraziamento alle persone incontrate lungo il percorso, ai progetti fatti insieme.',
  },
  {
    id: 'docenti',
    heading: 'A chi mi ha insegnato',
    body: 'TODO: ringraziamento a relatore, docenti e a chi ha avuto la pazienza di spiegare due volte.',
  },
  {
    id: 'chiusura',
    body: 'A chi ha tenuto questo oggetto tra le mani ed è arrivato fin qui: grazie.',
    emphasis: true,
  },
];

/**
 * The roll that scrolls on the screen beyond the door, and the list at the
 * bottom of the Grazie panel — same data, so the names stay readable without
 * WebGL and for a screen reader.
 *
 * Keep the groups short: the roll takes about twelve seconds per screenful.
 */
export const creditRoll: CreditGroup[] = [
  {
    heading: 'La mia famiglia',
    names: ['Pamela', 'Pierangelo', 'Aurora', 'Angelo'],
  },
  {
    heading: 'Chi c’era ogni giorno',
    names: ['Laura', 'Andrea', 'Mauro', 'Stefano', 'Stella', 'Senia', 'Vecchio'],
  },
];
