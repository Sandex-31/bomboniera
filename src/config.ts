/**
 * SINGLE SOURCE OF TRUTH for personal / deployment values.
 * Everything user-visible that is not academic content lives here.
 */
export const graduationConfig = {
  name: 'Salvatore Pierri',
  handle: 'SALVATORE.PIERRI()',
  degree: 'Computer Science',
  degreeLong: 'Corso di Laurea in Informatica',
  year: 2026,
  startYear: 2023,
  university: 'Università degli Studi di Torino',

  /** Absolute URL encoded into the QR code printed on the bomboniera. */
  qrBaseUrl: 'https://salvatorepierri.com/bomboniera',

  /**
   * Set to false once every TODO in src/data/* has been replaced with real
   * content. While true, a small "demo content" ribbon is shown.
   */
  isPlaceholder: false,
} as const;
