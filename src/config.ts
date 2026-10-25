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

/**
 * Per-guest variants: /?for=marco or #marco (see src/hooks/useGuest.ts).
 * The QR on each bomboniera can point at a different slug.
 * Omit or leave empty to always show the default greeting.
 */
export const guests: Record<string, { label: string; message: string }> = {
  // TODO: replace / extend with the real recipients
  famiglia: {
    label: 'Famiglia',
    message: 'Questa porta si apre solo per chi c’era dal primo giorno.',
  },
  marco: {
    label: 'Marco',
    message: 'Metà di questi progetti esistono per colpa tua. Grazie.',
  },
};

export type GuestKey = keyof typeof guests;
