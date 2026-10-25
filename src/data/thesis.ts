import type { Thesis } from '../types';

export const thesis: Thesis = {
  title: 'Riprogettazione e automazione dell’infrastruttura di CI/CD aziendale tramite Bitbucket Pipelines',
  subtitle: 'Tesi di Laurea Triennale in Informatica · Università di Torino · A.A. 2025/2026',
  supervisor: 'Prof. Gianluca Pozzato',
  abstract:
    'Il lavoro del tirocinio presso Drivesec: l’infrastruttura con cui il codice dell’azienda viene verificato, versionato e rilasciato. Diciotto repository in Rust, Go, Python e TypeScript avevano ciascuno la propria pipeline, scritta a modo suo e copiata da uno all’altro. La logica comune è finita in un’unica libreria condivisa, e sopra di essa sono nate le tre cose che mancavano: il calcolo automatico delle versioni, un CI gate che verifica il codice solo quando serve e una guardia che impedisce a una release candidate di arrivare in produzione. A margine, i Dev Container portano sulla macchina dello sviluppatore gli stessi strumenti della CI.',
  steps: [
    {
      label: 'Problema',
      body: 'Le pipeline dei 18 repository erano state scritte in momenti diversi da persone diverse. La stessa logica era copiata da un repository all’altro e le copie si erano allontanate: 10 su 18 non partivano da sole, solo 2 eseguivano test, solo 4 calcolavano la versione e nessuno impediva il rilascio di una release candidate.',
    },
    {
      label: 'Libreria condivisa',
      body: 'Una libreria Bash di otto moduli, caricata da tutte le pipeline da un punto d’ingresso unico e agganciata alla sua ultima versione stabile, così che una modifica raggiunga i repository solo quando viene pubblicata. Adottata in modo graduale, compatibile all’indietro.',
    },
    {
      label: 'Versionamento',
      body: 'Il tag come fonte di verità: la versione si deduce dalla provenienza dei merge, con regole uguali per tutti i repository. Quattro modelli successivi, fino al V4 con branch paralleli; quando le regole non coprono un caso, la decisione torna allo sviluppatore invece di indovinare.',
    },
    {
      label: 'CI gate e rilascio',
      body: 'Format, lint e test per ogni linguaggio, eseguiti solo quando il commit può portare informazione nuova. Una guardia sul deployment rende impossibile pubblicare una release candidate in produzione, qualunque sia l’ordine in cui Bitbucket valuta i pattern dei tag.',
    },
    {
      label: 'Risultato',
      body: 'Repository verificati da 2 a 16, con versione calcolata da 4 a 18, protetti dal rilascio di una release candidate da 0 a 18. Template di Dev Container per Rust e Python, poi estesi dal team a Go e TypeScript. Una correzione alla logica comune si scrive una volta e raggiunge tutti i repository.',
    },
  ],
  tech: ['Bitbucket Pipelines', 'Bash', 'Git', 'SemVer', 'Docker', 'Dev Container', 'Rust', 'Debian'],
  architecture: [
    'Libreria condivisa — otto moduli Bash, un punto d’ingresso unico, agganciata all’ultima versione stabile',
    'Versionamento automatico — tre famiglie di tag, develop decide il numero, master pubblica',
    'CI gate — controlli per Rust, Python e TypeScript, saltati quando il commit non tocca i sorgenti',
    'Guardia sul rilascio — nessuna release candidate in produzione',
    'Dev Container — template per Rust (con cargo-chef) e Python',
  ],
  results: [
    '18 repository su 18 usano la libreria',
    'Verifica automatica in 16 repository su 18 (erano 2)',
    'Versione e tag calcolati in 18 repository su 18 (erano 4)',
    'Guardia sul deployment in 18 repository su 18 (erano 0)',
    'Logica Bash nei file YAML dei repository pilota ridotta del 91%',
    '291 verifiche evitate, circa 3.300 minuti di build in meno (−37%)',
  ],
  pdf: 'media/tesi.pdf',
};
