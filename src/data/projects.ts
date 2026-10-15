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
    title: 'Catering',
    year: 2026,
    course: 'Sviluppo applicazioni software',
    summary: 'Il gestionale di un’azienda di catering, a strati.',
    description:
      'Business logic per eventi, menù, ricette, compiti di cucina e personale, con fogli riepilogativi e controllo delle autorizzazioni. Persistenza su SQLite e test JUnit sui casi d’uso.',
    tech: ['Java', 'Maven', 'SQLite', 'JUnit'],
  },
  {
    id: 'mtdi',
    noCode: true,
    lab: 'mtdi',
    title: 'Il banco delle scelte',
    year: 2025,
    course: 'Metodologie e tecnologie didattiche per l’informatica',
    summary: 'Una lezione sullo switch per la seconda superiore.',
    description:
      'Progetto di un’attività didattica sul costrutto switch e sul fall-through in Java: si parte da un problema che rende necessario lo switch, poi un’attività unplugged in cui la classe fa da programma, esercizi di problem-based learning, condivisione con il Jigsaw e dubbi raccolti con il Fishbowl. Con obiettivi classificati secondo la tassonomia SOLO e rubrica valutativa.',
    tech: ['Didattica dell’informatica', 'Java', 'Attività unplugged', 'PBL', 'Jigsaw'],
  },
  {
    id: 'so-centrale',
    lab: 'so',
    title: 'Centrale nucleare',
    year: 2024,
    course: 'Sistemi Operativi',
    summary: 'Una reazione a catena simulata con processi Unix.',
    description:
      'Simulazione di una centrale nucleare in C: un processo master crea atomi che si scindono generando nuovi processi, un attivatore che innesca le scissioni, un’alimentazione che immette nuovi atomi e un inibitore che assorbe energia. Tutti condividono lo stato in memoria condivisa System V, protetta da semafori; la simulazione termina per timeout, blackout, esplosione o meltdown (quando non si possono più creare processi).',
    tech: ['C', 'fork', 'Memoria condivisa', 'Semafori System V', 'Segnali', 'Make'],
  },
  {
    id: 'lft',
    lab: 'lft',
    title: 'Compilatore LFT',
    year: 2024,
    course: 'Linguaggi formali e traduttori',
    summary: 'Dal lexer al bytecode Java, un passo alla volta.',
    description:
      'Un piccolo linguaggio con assegnamenti, read, print, if ed espressioni in notazione prefissa, compilato per la JVM. Le consegne seguono la costruzione: automi a stati finiti, analizzatore lessicale, parser a discesa ricorsiva, valutatore e infine il traduttore che genera codice Jasmin eseguibile dalla macchina virtuale Java.',
    tech: ['Java', 'DFA', 'Parser LL(1)', 'Jasmin', 'JVM'],
  },
  {
    id: 'client-email',
    lab: 'email',
    title: 'Client Email',
    year: 2025,
    course: 'Programmazione III',
    summary: 'Una posta elettronica client-server in JavaFX.',
    description:
      'Un client di posta con interfaccia JavaFX e un server su socket TCP: login per indirizzo, invio, risposta e inoltro, casella aggiornata da un thread in ascolto e una vista amministratore che segue il log del server. Architettura MVC con viste FXML.',
    tech: ['Java', 'JavaFX', 'FXML', 'Socket', 'Thread', 'Maven'],
  },
];
