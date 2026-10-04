import type { Project } from '../types';

/**
 * TODO: replace with the real projects.
 * `media` paths resolve against the site base — put files in /public/media/.
 * A missing image never breaks the page: it falls back to a placeholder tile.
 */
export const projects: Project[] = [
  {
    id: 'distributed-app',
    title: 'Distributed Application',
    year: 2025,
    course: 'Ingegneria del Software',
    summary: 'Servizio distribuito containerizzato, progettato per essere messo in crisi.',
    description:
      'TODO: descrizione reale. Applicazione a servizi con API REST, persistenza su PostgreSQL, deploy containerizzato e test di carico per osservare il comportamento sotto stress.',
    tech: ['Java', 'Spring', 'Docker', 'PostgreSQL', 'AWS'],
    media: [{ src: 'media/distributed-1.png', alt: 'Architettura del sistema distribuito' }],
    github: 'https://github.com/',
  },
  {
    id: 'compiler-toy',
    title: 'Toy Compiler',
    year: 2025,
    course: 'Linguaggi e Traduttori',
    summary: 'Un linguaggio giocattolo, dal lexer alla macchina virtuale.',
    description:
      'TODO: descrizione reale. Front-end completo (lexing, parsing, AST, type checking) e back-end verso bytecode eseguito da una VM a stack scritta da zero.',
    tech: ['TypeScript', 'ANTLR', 'Vitest'],
    media: [{ src: 'media/compiler-1.png', alt: 'Output del compilatore' }],
    github: 'https://github.com/',
  },
  {
    id: 'graph-viz',
    title: 'Graph Playground',
    year: 2024,
    course: 'Algoritmi e Strutture Dati',
    summary: 'Visualizzatore interattivo di algoritmi su grafi.',
    description:
      'TODO: descrizione reale. Strumento didattico che anima Dijkstra, BFS/DFS e Kruskal passo per passo su grafi costruiti a mano.',
    tech: ['React', 'Canvas', 'TypeScript'],
    media: [{ src: 'media/graph-1.png', alt: 'Animazione di Dijkstra' }],
    demo: 'https://example.com',
  },
  {
    id: 'sensor-net',
    title: 'Sensor Mesh',
    year: 2024,
    course: 'Reti di Calcolatori',
    summary: 'Rete di sensori low-power con raccolta dati centralizzata.',
    description:
      'TODO: descrizione reale. Nodi embedded che pubblicano telemetria via MQTT verso un broker, con dashboard di monitoraggio e calibrazione manuale delle soglie.',
    tech: ['Python', 'MQTT', 'InfluxDB', 'Grafana'],
  },
];
