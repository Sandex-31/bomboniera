# Laboratorio per il corso di Algoritmi e Strutture Dati: regole d'esame, indicazioni generali e suggerimenti, consegne per gli esercizi

# Regole d'esame


## Studenti e studentesse di anni precedenti il 2024/2025

Gli studenti e le studentesse iscritti al secondo anno in un anno accademico precedente il 2024/2025 **possono** svolgere il laboratorio secondo:
-  le presenti specifiche

o, in alternativa e **entro e non oltre l'appello di settembre 2025**,

- le specifiche dell'anno accademico 2023/2024:
> [https://gitlab2.educ.di.unito.it/audrito/laboratorio-algoritmi-2023-2024](https://gitlab2.educ.di.unito.it/audrito/laboratorio-algoritmi-2023-2024)

Agli studenti che non hanno ancora cominciato a svolgere gli esercizi 3 o 4 delle precedenti specifiche è comunque consigliato di rifarsi alle specifiche nuove.

## Studenti e studentesse con Algoritmi non di 9 CFU

Gli studenti e le studentesse che hanno nel piano di studi l'insegnamento di Algoritmi con un numero di CFU **differente da 9** sono pregati di contattare il docente al più presto, al fine di concordare un programma d'esame commisurato ai CFU.

## Gruppi di laboratorio e turni

Il progetto di laboratorio può essere svolto individualmente o in gruppo (al più 3 persone). **I membri di uno stesso gruppo devono appartenere tutti allo stesso turno di laboratorio**.

Uno studente o una studentessa, assegnato/a al Turno X può spostarsi al Turno Y, **a patto che trovi un/a collega del turno Y che accetta di spostarsi al turno X**. La richiesta di spostamento deve essere inoltrata via email ai docenti di laboratorio, da parte di una persona che intende effettuare lo scambio, mettendo in cc la persona disposta allo scambio inverso ed entrambi i docenti coinvolti. Lo scambio si intende effettuato solo a seguito di esplicita autorizzazione (via email) da parte dei docenti.
E' possibile effettuare un solo spostamento di turno durante uno stesso anno accademico.
I docenti si riservano di respingere le richieste di spostamento che non dovessero pervenire con congruo anticipo (min. 1 mese) rispetto alla data dello scritto che si intende sostenere.

## Esame complessivo

Come specificato nella descrizione ufficiale dell'insegnamento (https://laurea.informatica.unito.it/do/corsi.pl/Show?_id=iw3r):

L'esame di Algoritmi e strutture dati consiste in una prova scritta, somministrata mediante la piattaforma Esami, ed in una discussione orale del progetto di laboratorio. Il superamento dello scritto permette di accedere alle prove orali della sessione in cui è stato superato lo scritto. Nel caso in cui questa seconda prova non venga superata entro i termini della sessione, lo scritto dovrà essere ripetuto. Il voto sarà la media pesata dei voti ottenuti nelle due prove scritta ed orale [in base ai crediti associati alle parti di teoria (6 CFU) e di laboratorio (3 CFU), nella media lo scritto peserà 6 e l'orale 3], valutate in 30+1 esimi, essendo comunque necessario il raggiungimento della sufficienza in entrambe le prove.

## Consegna del progetto e discussione orale

Il  progetto di laboratorio va consegnato mediante Git (vedi sotto) entro e non oltre la data della prova scritta che si intende sostenere. E' vietato sostenere la prova scritta in caso di mancata consegna del progetto di laboratorio.

La prova orale può essere sostenuta solo dopo il superamento della prova scritta.

In caso di superamento della prova scritta, la prova orale (discussione del laboratorio) va sostenuta **nella medesima sessione della prova scritta superata** (si ricorda che le sessioni sono gennaio-febbraio 2025, giugno-luglio 2025, settembre 2025).

Si noti che per quelle sessioni per cui sono previsti due appelli esisteranno due possibilità per la discussione del laboratorio (primo o secondo appello della sessione); per le sessioni in cui è previsto un solo appello, la discussione deve essere effettuata necessariamente in quell'appello.

Esempio (caso di una sessione con 2 appelli):

- la studentessa/lo studente X sostiene la prova scritta nel primo appello di una sessione con 2 appelli;
- la studentessa/lo studente X deve assicurarsi che il progetto su GitLab, alla data della prova scritta che intende sostenere (in questo esempio, quella del primo appello della sessione), sia aggiornato alla versione che vuole presentare al docente di laboratorio;
- se la studentessa/lo studente X supera la prova scritta nel primo appello della sessione, deve (pena la perdita del voto ottenuto nella prova scritta):
-- iscriversi a uno dei due appelli orali della stessa sessione
-- prenotarsi su i-learn in uno degli slot messi a disposizione dal docente del turno di appartenenza
-- sostenere l'orale nello slot temporale prenotato.

Studentesse/studenti diversi, appartenenti allo stesso gruppo di laboratorio , possono sostenere la prova **scritta** nello stesso appello o in appelli diversi. Se studentesse/studenti diversi, appartenenti allo stesso gruppo, superano la prova scritta nello stesso appello, **devono** sostenere l' **orale** nello stesso appello orale. Se studentesse/studenti diversi, appartenenti allo stesso gruppo, superano la prova scritta in appelli diversi, **possono** sostenere l'**orale** in appelli diversi.

Ad esempio, si consideri un gruppo di laboratorio costituito dalle studentesse/dagli studenti X, Y e Z, e si supponga che i soli X e Y sostengano la prova scritta nel primo appello di una sessione con due appelli, X con successo, mentre Y con esito insufficiente. Devono essere rispettate le seguenti condizioni:

- alla data della prova scritta del primo appello della sessione, il progetto di laboratorio del gruppo deve essere aggiornato alla versione che si intende presentare;
- il solo studente X deve sostenere la prova orale nella stessa sessione in cui ha superato lo scritto,  procedendo come indicato nell'esempio riportato sopra, mentre Y e Z sosterranno la discussione quando avranno superato la prova scritta.
- Supponiamo che Y e Z superino la prova scritta nell'appello di una sessione con un solo appello: essi dovranno sostenere la prova orale in quello stesso appello.
- Gli studenti Y e Z dovranno, di norma, discutere la stessa versione del progetto di laboratorio che ha discusso lo studente X; i.e., eventuali modifiche al laboratorio successive alla discussione di X dovranno essere di modesta entità, debitamente documentate (i.e., il log delle modifiche dovrà comparire su GitLab) e motivate.

**Validità del progetto di laboratorio** : le specifiche per il progetto di laboratorio descritte in questo documento resteranno valide fino all'ultimo appello relativo al corrente anno accademico **(vale a dire, quella di settembre 2025)** e non oltre! Gli appelli delle sessioni successive a quella dovranno essere sostenuti sulla base delle specifiche che verranno descritte nella prossima edizione del laboratorio di algoritmi.

# Indicazioni generali e suggerimenti

## Uso di Git

Durante la scrittura del codice è richiesto di usare in modo appropriato il sistema di versioning Git. Questa richiesta implica quanto segue:

- il progetto di laboratorio va inizializzato "clonando" il repository del laboratorio come descritto nel file Git.md;
- come è prassi nei moderni ambienti di sviluppo, è richiesto di effettuare commit frequenti, con un nome significativo. L'ideale è un commit per ogni blocco di lavoro terminato (es. creazione e test di una nuova funzione, soluzione di un baco, creazione di una nuova interfaccia, ...);
- ogni membro del gruppo dovrebbe effettuare il commit delle modifiche che lo hanno visto come principale sviluppatore;
- al termine del lavoro si dovrà consegnare l'intero repository (dandone accesso al docente).

Il file Git.md contiene un esempio di come usare Git per lo sviluppo degli esercizi proposti per questo laboratorio.

---

**Nota importante**: Su git dovrà essere caricato solamente il codice sorgente, in particolare nessun file dati dovrà essere oggetto di commit!

---

Si rammenta che la valutazione del progetto di laboratorio considererà anche l'uso adeguato di git da parte di ciascun membro del gruppo.

## Linguaggio in cui sviluppare il laboratorio

L'intera implementazione del laboratorio deve essere realizzata nel linguaggio C.

Come indicato sotto, alcuni esercizi chiedono di implementare **codice generico**. Con "codice generico" si intende codice che deve poter essere eseguito con tipi di dato non noti a tempo di compilazione.

**Suggerimento per la realizzazione di codice generico in C**: Nel caso del C, è necessario capire come meglio approssimare l'idea di codice generico utilizzando quanto permesso dal linguaggio. Un approccio comune è far sì che le funzioni e le procedure presenti nel codice prendano in input puntatori a `void` e utilizzino qualche funzione fornita dall'utente per accedere alle componenti necessarie (uso di puntatori a funzione).

## Uso di librerie esterne e/o native del linguaggio scelto

È vietato l'uso di strutture dati native del linguaggio scelto o offerte da librerie esterne, quando la loro realizzazione è richiesta da uno degli esercizi proposti.

È, invece, possibile l'uso di strutture dati native del linguaggio o offerte da librerie esterne, se la loro realizzazione non è richiesta da uno degli esercizi proposti.

**Esempio:** l'uso di una libreria C che implementa array dinamici è consentito, solo se nessun esercizio chiede la realizzazione di un array dinamico.

## Relazione sugli esercizi

La relazione, per quegli esercizi che la richiedono, deve essere inserita nel file README.md del progetto, divenendo così parte integrante della documentazione.
Le relazioni sono presenti nei file.pdf presenti nella cartella.

## Unit Testing

Come indicato esplicitamente nei testi degli esercizi, il progetto di laboratorio comprende anche la definizione di opportune suite di unit test.

Si rammenta, però, che il focus del laboratorio è l'implementazione di strutture dati e algoritmi. Relativamente agli unit-test sarà quindi sufficiente che gli studenti dimostrino di averne colto il senso e di saper realizzare una suite di test sufficiente a coprire i casi più comuni e i casi limite.

## Qualità dell'implementazione

È parte del mandato degli esercizi la realizzazione di codice di buona qualità.

Per "buona qualità" intendiamo codice ben organizzato, ben modularizzato, ben commentato e ben testato.

**Alcuni suggerimenti:**

- **Importante**: Gli esercizi richiedono (fra le altre cose) di sviluppare codice generico. Nello sviluppare questa parte, si deve assumere di stare sviluppando una libreria generica intesa come fondamento di futuri programmi. Non è pertanto lecito fare assunzioni semplificative; in generale, l'implementazione della libreria generica deve restare separata e non deve essere influenzata in alcun modo dagli usi di essa eventualmente richiesti negli esercizi (ad esempio, se un esercizio dovesse richiedere l'implementazione della struttura dati grafo e quello stesso o un altro esercizio dovesse richiedere l'implementazione, a partire da tale struttura dati, di un algoritmo per il calcolo delle componenti connesse di un grafo, l'implementazione della struttura dati dovrebbe essere separata dall'algoritmo per il calcolo delle componenti connesse e *non* dovrebbe contenere elementi – variabili, procedure, funzioni, definizioni di tipo, ecc. – eventualmente utili a tale algoritmo, ma non essenziali alla struttura dati; analogamente, se un esercizio dovesse richiedere di operare su grafi con nodi di tipo stringa, l'implementazione della struttura dati grafo dovrebbe restare generica e non potrebbe quindi assumere per i nodi il solo tipo stringa).
- verificare che il codice sia suddiviso correttamente in package o moduli;
- aggiungere un commento, prima di una definizione, che spieghi il funzionamento dell'oggetto definito, meglio se in formato [doxygen](https://www.doxygen.nl). Evitare quando possibile di commentare direttamente il codice interno alle funzioni/metodi implementati (se il codice è ben scritto, i commenti in genere non servono);
- la lunghezza di un metodo/funzione è in genere un campanello di allarme: se essa cresce troppo, probabilmente è necessario rifattorizzare il codice spezzando la funzione in più parti. In linea di massima si può consigliare di intervenire quando la funzione cresce sopra le 30 righe (considerando anche commenti e spazi bianchi);
- sono accettabili commenti in italiano, sebbene siano preferibili in inglese;
- tutti i nomi (es., nomi di variabili, di metodi, di classi, ecc.) *devono* essere significativi e in inglese;
- il codice deve essere correttamente indentato; impostare l'indentazione a 2 o 4 caratteri e impostare l'editor in modo che inserisca "soft tabs" (cioè, deve inserire il numero corretto di spazi invece che un carattere di tabulazione);
- per dare i nomi agli identificatori, seguire le convenzioni in uso per il linguaggio C:
  - macro e costanti sono tutti in maiuscolo e in formato snake case (es. THE\_MACRO, THE\_CONSTANT); i nomi di tipo (e.g.  struct, typedefs, enums, ...) iniziano con una lettera maiuscola e proseguono in camel case (e.g., TheType, TheStruct); i nomi di funzione iniziano con una lettera minuscola e proseguono in snake case (e.g., the\_function());
- i file vanno salvati in formato UTF-8.

# Consegne per gli esercizi

In sede di discussione d'esame, sarà facoltà del docente chiedere di eseguire gli algoritmi implementati su dati forniti dal docente stesso. Nel caso questi dati siano memorizzati su file, questi saranno dei csv con la medesima struttura dei dataset forniti e descritti nel testo dell'esercizio. I codici sviluppati dovranno consentire un rapido e semplice adattamento agli input forniti: ad esempio, **una buona implementazione consentirà di inserire in input il nome del file su cui eseguire il test**, mentre una peggiore richiederà di modificare il codice sorgente e una successiva compilazione a fronte della sola modifica del nome del file contenente il dataset.

Per alcune parti degli esercizi sarà anche fornita durante il corso una piattaforma per la valutazione automatica della correttezza del codice prodotto.


## Esercizio 1 - Merge Sort e Quick Sort

### Testo

Implementare una libreria che offre gli algoritmi di ordinamento  *Merge Sort* e *Quick Sort* su dati generici, implementando i seguenti prototipi di funzione:

```
void merge_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*));
void quick_sort(void *base, size_t nitems, size_t size, int (*compar)(const void*, const void*));
```

- `base` è un puntatore al primo elemento dell'array da ordinare;
- `nitems` è il numero di elementi nell'array da ordinare;
- `size` è la dimensione in bytes di ogni elemento dell'array;
- `compar` è il criterio secondo cui ordinare i dati (dati due **puntatori a elementi** dell'array, restituisce un numero maggiore, uguale o minore di zero se il primo argomento è rispettivamente maggiore, uguale o minore del secondo).

È anche possibile implementare in alternativa i seguenti prototipi, che ordinano dati a patto che siano organizzati in un array di puntatori:

```
void merge_sort(void **base, size_t nitems, int (*compar)(const void*, const void*));
void quick_sort(void **base, size_t nitems, int (*compar)(const void*, const void*));
```

- `base` è un puntatore al primo elemento dell'array di puntatori da ordinare sulla base dei valori riferiti;
- `nitems` è il numero di elementi nell'array di puntatori da ordinare;
- `compar` è il criterio secondo cui ordinare i dati (dati due **elementi** dell'array di puntatori).

Dato che la prima versione è anche in grado di ordinare array di puntatori (passando un comparatore opportuno, i cui argomenti saranno puntatori a puntatori ai dati), non serve implementare questa seconda versione se avete già implementato la prima. In ogni caso non serve neanche implementare la prima se avete già implementato la seconda.

### Unit Testing

Implementare gli unit-test per la libreria secondo le indicazioni suggerite nel documento [Unit Testing](UnitTesting.md).

### Uso della libreria di ordinamento implementata

Il file `records.csv` che potete trovare (compresso) all'indirizzo:

> [https://datacloud.di.unito.it/index.php/s/9sQmzB9TdDHezX7](https://datacloud.di.unito.it/index.php/s/9sQmzB9TdDHezX7)

contiene 20 milioni di record da ordinare.
Ogni record è descritto su una riga e contiene i seguenti campi:

- `id`: (tipo intero) identificatore univoco del record;
- `field1`: (tipo stringa) contiene parole estratte dalla divina commedia,
  potete assumere che i valori non contengano spazi o virgole;
- `field2`: (tipo intero);
- `field3`: (tipo floating point).

Il formato è un CSV standard: i campi sono separati da virgole; i record sono
separati da `\n`.

Usando l'algoritmo implementato precedentemente, si realizzi la seguente funzione per ordinare *record* contenuti nel file `records.csv` in ordine non decrescente secondo i valori contenuti nei tre campi "field".

```
void sort_records(FILE *infile, FILE *outfile, size_t field, size_t algo);
```

- `infile` è il file contenente i record da ordinare;
- `outfile` è il file nel quale salvare i record ordinati (che deve essere diverso da `infile`);
- `field` può valere 1, 2 o 3 e indica quale dei tre campi deve essere usato per ordinare i record.
- `algo` può valere 1 o 2 e indica quale algoritmo di ordinamento deve essere usato (MergeSort o QuickSort) per ordinare i record.

Si misurino i tempi di risposta per i due algoritmi, per ciascuno dei tre field che si possono usare come chiave di ordinamento, e si produca una breve relazione in cui si riportano i risultati ottenuti insieme a un loro commento. Il commento deve essere basato su statistiche numeriche sui tempi di esecuzione misurati. Nel caso l'ordinamento si protragga per più di 10 minuti potete interrompere l'esecuzione e riportare un fallimento dell'operazione. I risultati sono quelli che vi sareste aspettati? Se sì, perché? Se no, fate delle ipotesi circa il motivo per cui gli algoritmi non funzionano come vi aspettate, verificatele e riportate quanto scoperto nella relazione. I risultati dipendono dal campo usato come chiave di ordinamento?

**Si ricorda che il file `records.csv` (e i file compilati) NON DEVONO ESSERE OGGETTO DI COMMIT SU GIT!**

### Condizioni per la consegna:

- Creare una sottocartella chiamata `ex1` all'interno del repository.
- La consegna deve obbligatoriamente contenere un `Makefile`. Questo file con il comando `make all` deve produrre all'interno di `ex1/bin` due file eseguibili chiamati `main_ex1` e `test_ex1`. Se avete usato librerie esterne (come Unity) includete anche queste per consentire la corretta compilazione.
- L'eseguibile `test_ex1` non deve richiedere nessun parametro e deve eseguire tutti gli unit test automatizzati prodotti.
- L'eseguibile `main_ex1` deve ricevere come parametri il percorso del file CSV contenente i record da ordinare, il percorso del file in cui salvare i record ordinati, il valore del campo `field` da utilizzare per l'ordinamento, e l'indicazione dell'algoritmo da utilizzare. Per esempio:

```
$ ./main_ex1 /tmp/data/records.csv /tmp/data/sorted.csv 1 2
```


## Esercizio 2 - Edit distance

### Testo

Si consideri il problema di determinare la minima distanza di edit tra due stringhe (_edit distance_): date due stringhe $s_1$ e $s_2$, non necessariamente della stessa lunghezza, determinare il minimo numero di operazioni necessarie per trasformare la stringa $s_2$ in $s_1$. Si assuma che le operazioni disponibili siano solo due: **cancellazione** e **inserimento**. Per esempio:

- "casa" e "cassa" hanno edit distance pari a 1 (1 cancellazione);
- "casa" e "cara" hanno edit distance pari a 2 (1 cancellazione + 1 inserimento);
- “vinaio” e “vino” hanno edit distance=2 (2 inserimenti);
- "tassa" e "passato" hanno edit distance pari a 4 (3 cancellazioni + 1 inserimento);
- "pioppo" e "pioppo" hanno edit distance pari a 0.

Si implementi innanzitutto una funzione ricorsiva di calcolo della edit distance, implementando il seguente prototipo di funzione:

```
int edit_distance(const char *s1, const char* s2);
```

- `s1` è la stringa che si vuole ottenere $s_1$;
- `s2` è la stringa di partenza $s_2$.

La struttura della funzione deve rispecchiare la seguente definizione (indichiamo con $|s|$ la lunghezza di $s$ e con $\mathrm{rest}(s)$ la sottostringa di $s$ ottenuta ignorando il primo carattere di $s$):

- se $|s_1|$ = 0, allora $\mathrm{edit\_distance}(s_1,s_2) = |s_2|$;
- se $|s_2|$ = 0, allora $\mathrm{edit\_distance}(s_1,s_2) = |s_1|$;
- altrimenti, siano:
  - $d_{\mathrm{no-op}} = \mathrm{edit\_distance}(\mathrm{rest}(s1),\mathrm{rest}(s2))$   se $s1[0]=s2[0]$, $\infty$ altrimenti
  - $d_{\mathrm{canc}} = 1 + \mathrm{edit\_distance}(s1,\mathrm{rest}(s2))$
  - $d_{\mathrm{ins}} = 1 + \mathrm{edit\_distance}(\mathrm{rest}(s1),s2)$

Si ha quindi che: $\mathrm{edit\_distance}(s_1,s_2) = \min\{d_{\mathrm{no-op}}, d_{\mathrm{canc}}, d_{\mathrm{ins}}\}$.

In seguito, si implementi anche una versione della funzione di calcolo della edit distance che adotta una strategia di programmazione dinamica. Tale versione deve essere anch'essa ricorsiva (in particolare, essa deve essere ottenuta attraverso un insieme minimale di modifiche apportate all'implementazione richiesta al punto precedente). La funzione deve implementare il seguente prototipo:

```
int edit_distance_dyn(const char *s1, const char* s2);
```

*Nota*: Le definizioni sopra riportate non corrispondono al modo usuale di definire la distanza di edit. Sono comunque quelle necessarie a risolvere l'esercizio e su cui dovrà essere basato il codice prodotto.

### Unit Testing

Implementare gli unit-test degli algoritmi secondo le indicazioni suggerite nel documento [Unit Testing](UnitTesting.md).

### Uso delle funzioni implementate

All'indirizzo:

> [https://datacloud.di.unito.it/index.php/s/9BKY7BXFCY4bMcB](https://datacloud.di.unito.it/index.php/s/9BKY7BXFCY4bMcB)

potete trovare un dizionario (`dictionary.txt`) e un file da correggere (`correctme.txt`).

Il dizionario contiene un elenco di parole. Le parole sono scritte di seguito, ciascuna su una riga.

Il file `correctme.txt` contiene un testo da correggere. Alcune parole in questo testo non ci sono nel dizionario.

Si implementi un'applicazione che usa la funzione `edit_distance_dyn` per determinare, per ogni parola `w` in `correctme.txt`, una breve lista di parole in `dictionary.txt` con edit distance minima da `w`. Si sperimenti il funzionamento dell'applicazione e si riporti in una breve relazione i risultati degli esperimenti.

**Si ricorda** che i file `dictionary.txt` e `correctme.txt` non devono essere oggetto di commit su git!

### Condizioni per la consegna:

- Creare una sottocartella chiamata `ex2` all'interno del repository.
- La consegna deve obbligatoriamente contenere un `Makefile`. Questo file con il comando `make all` deve produrre all'interno di `ex2/bin` due file eseguibili chiamati `main_ex2` e `test_ex2`. Se avete usato librerie esterne (come Unity) includete anche queste per consentire la corretta compilazione.
- L'eseguibile `test_ex2` non deve richiedere nessun parametro e deve eseguire tutti gli unit test automatizzati prodotti.
- L'eseguibile `main_ex2` deve ricevere come parametri il percorso del dizionario da usare come riferimento e il file da correggere. Per esempio:

```
$ ./main_ex2 /tmp/data/dictionary.txt /tmp/data/correctme.txt
```


## Esercizio 3 - Tavole hash (con concatenamento)


### Testo

Si implementi, avvalendosi del supporto di un sistema basato su un Large Language Model, quale, ad esempio, ChatGPT (si veda sotto), una libreria generica che realizza la struttura dati *tavola hash (con concatenamento)* in grado di ospitare un insieme di coppie {<chiave_1,valore_1>,...,<chiave_n,valore_n>}.

La tavola hash deve accettare chiavi e valori di tipi generici (tutte le chiavi hanno uno stesso tipo, tutti i valori hanno uno stesso tipo, ma chiavi e valori possono avere tipi fra loro differenti).

La struttura dati deve offrire almeno le seguenti funzionalità (ricavare il significato delle varie funzioni e procedure e dei loro parametri a partire dai loro prototipi e da quanto studiato nella parte di teoria del corso):

```
HashTable* hash_table_create(int (*f1)(const void*,const void*), unsigned long (*f2)(const void*));
void hash_table_put(HashTable*, const void*, const void*);
void* hash_table_get(const HashTable*, const void*);
int hash_table_contains_key(const HashTable*, const void*);
void hash_table_remove(HashTable*, const void*);
int hash_table_size(const HashTable*);
void** hash_table_keyset(const HashTable*);
void hash_table_free(HashTable*);
```

### Unit Testing

Implementare avvalendosi del supporto di un sistema basato su un Large Language Model (LLM), quale, ad esempio, ChatGPT (si veda sotto), gli unit-test degli algoritmi secondo le indicazioni suggerite nel documento [Unit Testing](UnitTesting.md).

### Uso delle funzioni implementate

All'indirizzo:

> [https://datacloud.di.unito.it/index.php/s/Ti4Mz7j4Xtjn3Db](https://datacloud.di.unito.it/index.php/s/Ti4Mz7j4Xtjn3Db)

potete trovare un file (`iliade.txt`) contenente l'Iliade di Omero in inglese.

Avvalendosi di un sistema basato su LLM, scrivere un programma che utilizza l'hash table implementata per calcolare la parola di lunghezza almeno pari ad un valore minimo dato che sia più frequente nel file di testo dato.

### Uso di sistema basato su un Large Language Model

Si richiede che per implementare quanto richiesto dal presente esercizio ci si avvalga del supporto di un sistema basato su un Large Language Model, quale, ad esempio, ChatGPT.

E' possibile che il processo di sviluppo risulti iterativo, comportando varie interazioni con il sistema LLM.

Si documenti, in una relazione (README.md su git), il suddetto processo di sviluppo nei suoi aspetti principali (prompt iniziale, output prodotto dal sistema, analisi critica dell'output, raffinamento del prompt, ecc.) e si riportino alcune considerazioni generali sull'intero processo.

### Condizioni per la consegna:

- Creare una sottocartella chiamata `ex3` all'interno del repository.
- La consegna deve obbligatoriamente contenere un `Makefile`. Questo file con il comando `make all` deve produrre all'interno di `ex3/bin` due file eseguibili chiamati `main_ex3` e `test_ex3`. Se avete usato librerie esterne (come Unity) includete anche queste per consentire la corretta compilazione.
- L'eseguibile `test_ex3` non deve richiedere nessun parametro e deve eseguire tutti gli unit test automatizzati prodotti.
- L'eseguibile `main_ex3` deve ricevere come parametri il percorso del file di testo da usare e la lunghezza minima delle parole da considerare. Per esempio:

```
$ ./main_ex3 /tmp/data/iliade.txt 6
```


## Esercizio 4 - Grafi sparsi e Visita in Ampiezza

### Linguaggio richiesto: C

### Testo

Si implementi una libreria che realizza la struttura dati *Grafo* in modo che sia ottimale per dati sparsi
(**attenzione**: le scelte implementative che farete dovranno essere giustificate in relazione alle nozioni presentate
durante le lezioni in aula).

È richiesto che l'implementazione sfrutti la Tavola Hash implementata nell'esercizio 3.

L'implementazione deve essere generica sia per quanto riguarda il tipo dei nodi, sia per quanto riguarda le etichette
degli archi, implementando le funzioni riportate nel seguente header file (con requisiti minimi di complessità; dove _N_ può indicare il numero di nodi o il numero di archi, a seconda del contesto):

```
graph.h

typedef struct graph *Graph;

typedef struct edge {
   void* source; //nodo d'origine
   void* dest; //nodo di destinazione
   void* label; //etichetta dell'arco
}Edge;

Graph graph_create(int labelled, int directed,
                     int (*compare)(const void*, const void*),
                     unsigned long (*hash)(const void*));

//crea un grafo vuoto, etichettato se labelled == 1 e diretto se directed == 1,
//le funzioni f1 e f2 sono necessarie per la costruzione della tavola hash che deve essere usata dalla libreria -- O(1)

int graph_is_directed(const Graph gr);                                                           // dice se il grafo è diretto o meno -- O(1)
int graph_is_labelled(const Graph gr);                                                           // dice se il grafo è etichettato o meno -- O(1)
int graph_add_node(Graph gr, const void* node);                                                  // aggiunge un nodo -- O(1)
int graph_add_edge(Graph gr, const void* node1, const void* node2, const void* label);           // aggiunge un arco dati estremi ed etichetta -- O(1) (*)
int graph_contains_node(const Graph gr, const void* node);                                       // controlla se un nodo è nel grafo -- O(1)
int graph_contains_edge(const Graph gr, const void* node1, const void* node2);                   // controlla se un arco è nel grafo -- O(1) (*)
int graph_remove_node(Graph gr, const void* node);                                               // rimuove un nodo dal grafo -- O(N)
int graph_remove_edge(Graph gr, const void* node1, const void* node2);                           // rimuove un arco dal grafo -- O(1) (*)
int graph_num_nodes(const Graph gr);                                                             // numero di nodi -- O(1)
int graph_num_edges(const Graph gr);                                                             // numero di archi -- O(N)
void** graph_get_nodes(const Graph gr);                                                          // recupero dei nodi del grafo -- O(N)
Edge** graph_get_edges(const Graph gr);                                                          // recupero degli archi del grafo -- O(N)
void** graph_get_neighbours(const Graph gr, const void* node);                                   // recupero dei nodi adiacenti ad un dato nodo -- O(1) (*)
int graph_num_neighbours(const Graph gr, const void* node);                                      // recupero del numero di nodi adiacenti ad un dato nodo -- O(1)
void* graph_get_label(const Graph gr, const void* node1, const void* node2);                     // recupero dell'etichetta di un arco -- O(1) (*)
void graph_free(Graph gr);

```

_(*)_ quando il grafo è veramente sparso, assumendo che l'operazione venga effettuata su un nodo la cui lista di adiacenza ha una lunghezza in O(1).

La struttura ```struct graph``` deve essere decisa prendendo in considerazione la richiesta di usare la Tabella Hash dell'esercizio precedente.


*Suggerimento*:  un grafo non diretto può essere rappresentato usando un'implementazione per grafi diretti modificata
per garantire che, per ogni arco *(a,b)* etichettato *w*, presente nel grafo, sia presente nel grafo anche l'arco *(b,a)*
etichettato *w*. Ovviamente, il grafo dovrà mantenere l'informazione che specifica se esso è un grafo diretto o non diretto.
Similmente, un grafo non etichettato può essere rappresentato usando l'implementazione per grafi etichettati modificata per garantire
che le etichette siano sempre `null` (che invece non devono mai essere `null` per i grafi etichettati).

### Unit Testing

Implementare gli unit-test degli algoritmi secondo le indicazioni suggerite nel documento [Unit Testing](UnitTesting.md).

### Uso della libreria che implementa la struttura dati Grafo

Si implementi l'algoritmo di visita in ampiezza secondo il seguente prototipo di funzione

```
void** breadth_first_visit(Graph gr, void* start, int (*compare)(const void*, const void*), unsigned long (*hash)(const void*));
//start è il nodo di partenza da cui cominciare la visita, la funzione restituisce l'array dei nodi nell'ordine di visita.
//eventualmente, la funzione restituisce null se il nodo start non è presente nel grafo gr.

```

L'implementazione dell'algoritmo di visita in ampiezza dovrà utilizzare la libreria sui grafi appena implementata.
L'algoritmo dovrà poi essere usato con i dati contenuti nel file `italian_dist_graph.csv`, che potete recuperare all'indirizzo:

> [https://datacloud.di.unito.it/index.php/s/FqneW99EGWLSRpY](https://datacloud.di.unito.it/index.php/s/FqneW99EGWLSRpY)

Tale file contiene le distanze in metri tra varie località italiane e una frazione delle località a loro più vicine. Il formato è un CSV standard: i campi sono separati da virgole; i record sono separati dal carattere di fine riga (`\n`).

Ogni record contiene i seguenti dati:

- `place1`: (tipo stringa) nome della località "sorgente" (la stringa può contenere spazi ma non può contenere virgole);
- `place2`: (tipo stringa) nome della località "destinazione" (la stringa può contenere spazi ma non può contenere virgole);
- `distance`: (tipo float) distanza in metri tra le due località.

**Note:**

- Potete interpretare le informazioni presenti nelle righe del file come archi **non diretti** (per cui probabilmente vorrete inserire nel vostro grafo sia l'arco di andata che quello di ritorno a fronte di ogni riga letta).
- Il file è stato creato a partire da un dataset poco accurato. I dati riportati contengono inesattezze e imprecisioni.

**Si ricorda che il file `italian_dist_graph.csv` (e i file compilati) NON DEVONO ESSERE OGGETTO DI COMMIT SU GIT!**

### Condizioni per la consegna:

- Creare una sottocartella chiamata `ex3-4` all'interno del repository, che conterrà i file relativi a questo esercizio e al precedente.
- Includete nella consegna anche un `Makefile` che con il comando `make all` deve produrre all'interno di `ex3-4/bin` due file eseguibili chiamati `main_ex3-4` e `test_ex3-4`. Se avete usato librerie esterne (come Unity) includete anche queste per consentire la corretta compilazione.
- L'eseguibile `test_ex3-4` non deve richiedere nessun parametro e deve eseguire tutti gli unit test automatizzati prodotti.
- L'eseguibile `main_ex3-4` deve ricevere come parametri il percorso del file `italian_dist_graph.csv`, il nome della città di partenza e il nome di un file di output, e salvare in quest'ultimo i nomi delle località visitate durante una visita in ampiezza del grafo, un nome per riga, partendo da un nodo di partenza specificato. I nomi dei file non devono essere hardcoded, ma devono essere passati come argomenti da linea di comando.

```
$ ./main_ex3-4 italian_dist_graph.csv torino output.txt
```

Si documenti brevemente, in una relazione (README.md su git), le scelte implementative effettuate e i risultati e tempi dell'esecuzione dell'algoritmo rispetto a quanto atteso.
