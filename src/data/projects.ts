import type { Project } from '../types';

/**
 * `media` paths resolve against the site base — put files in /public/media/.
 * A missing image never breaks the page: it falls back to a placeholder tile.
 */
export const projects: Project[] = [
  {
    id: 'food-delivery-db',
    lab: 'sql',
    title: 'Food Delivery DB',
    year: 2024,
    course: 'Basi di Dati',
    summary: 'Il database di un’app di delivery, dai requisiti allo schema.',
    description:
      'Progettazione completa della base di dati per una piattaforma di food delivery: analisi dei requisiti, glossario dei termini, schema E-R con utenti, ristoranti, rider, ordini, portate e recensioni, fino alla traduzione nello schema relazionale.',
    tech: ['SQL', 'Modello E-R', 'Schema relazionale'],
  },
  {
    id: 'lab-asd',
    lab: 'asd',
    title: 'Laboratorio di Algoritmi',
    year: 2025,
    course: 'Algoritmi e Strutture Dati',
    summary: 'Quattro esercizi in C, dagli ordinamenti ai grafi.',
    description:
      'Merge Sort e Quick Sort su milioni di record, edit distance, tabelle hash con concatenamento e grafi sparsi con visita in ampiezza sulle distanze tra città italiane. Ogni esercizio con unit test e relazione.',
    tech: ['C', 'Make', 'Unit testing', 'Doxygen'],
    github: 'https://github.com/Sandex-31/laboratorio-algoritmi-2024-2025',
  },
  {
    id: 'film-data',
    lab: 'site',
    title: 'Film Data Web App',
    year: 2025,
    course: 'Interazione uomo macchina e tecnologie web',
    summary: 'Una piattaforma di film divisa in microservizi.',
    description:
      'Un gateway centrale che smista le richieste tra un servizio del catalogo su PostgreSQL e uno delle recensioni su MongoDB con chat in tempo reale, più un sito Express/Handlebars per cercare i film e notebook Jupyter per l’analisi dei dati.',
    tech: ['Express', 'Handlebars', 'PostgreSQL', 'MongoDB', 'Socket.io', 'Jupyter'],
    media: [
      { src: 'media/ium-tweb-home.jpeg', alt: 'Pagina principale del sito di film' },
      { src: 'media/ium-tweb-film.jpeg', alt: 'Pagina di dettaglio di un film' },
    ],
    github: 'https://github.com/SalvatorePierri/Project_IUM_TWEB',
  },
  {
    id: 'catering',
    lab: 'sql',
    title: 'Cat & Ring',
    year: 2026,
    course: 'Sviluppo applicazioni software',
    summary: 'Il gestionale di un’azienda di catering, a strati.',
    description:
      'Business logic per eventi, menù, ricette, compiti di cucina e personale, con fogli riepilogativi e controllo delle autorizzazioni. Persistenza su SQLite e test JUnit sui casi d’uso.',
    tech: ['Java', 'Maven', 'SQLite', 'JUnit'],
  },
];
