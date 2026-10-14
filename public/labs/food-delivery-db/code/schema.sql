PRAGMA foreign_keys = ON;

CREATE TABLE utente (
  email          TEXT PRIMARY KEY,
  nome           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  telefono       TEXT NOT NULL,
  indirizzo      TEXT NOT NULL,
  premium        INTEGER NOT NULL DEFAULT 0 CHECK (premium IN (0, 1)),
  numero_ordini  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE conto (
  utente  TEXT PRIMARY KEY REFERENCES utente(email),
  saldo   REAL NOT NULL DEFAULT 0 CHECK (saldo >= 0)
);

CREATE TABLE metodo_pagamento (
  id       INTEGER PRIMARY KEY,
  utente   TEXT NOT NULL REFERENCES utente(email),
  tipo     TEXT NOT NULL CHECK (tipo IN ('carta', 'paypal', 'satispay')),
  ultime4  TEXT
);

CREATE TABLE ristorante (
  codice               INTEGER PRIMARY KEY,
  nome                 TEXT NOT NULL,
  descrizione          TEXT NOT NULL,
  tipo_cibo            TEXT NOT NULL,
  costo_spedizione     REAL NOT NULL CHECK (costo_spedizione >= 0),
  stelle               REAL NOT NULL DEFAULT 0 CHECK (stelle BETWEEN 0 AND 5),
  top_partner          INTEGER NOT NULL DEFAULT 0 CHECK (top_partner IN (0, 1)),
  ingresso_top_partner TEXT
);

CREATE TABLE portata (
  id          INTEGER PRIMARY KEY,
  ristorante  INTEGER NOT NULL REFERENCES ristorante(codice),
  titolo      TEXT NOT NULL,
  ingredienti TEXT NOT NULL,
  allergeni   TEXT NOT NULL DEFAULT '',
  prezzo      REAL NOT NULL CHECK (prezzo > 0),
  sconto      REAL NOT NULL DEFAULT 0 CHECK (sconto BETWEEN 0 AND 0.5)
);

CREATE TABLE rider (
  codice      INTEGER PRIMARY KEY,
  stato       TEXT NOT NULL CHECK (stato IN ('Disponibile', 'Occupato', 'Assente')),
  mezzo       TEXT NOT NULL CHECK (mezzo IN ('bicicletta', 'bicicletta elettrica', 'monopattino')),
  batteria_km REAL CHECK (batteria_km IS NULL OR batteria_km >= 0),
  lat         REAL NOT NULL,
  lon         REAL NOT NULL,
  consegne    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ordine (
  id               INTEGER PRIMARY KEY,
  utente           TEXT NOT NULL REFERENCES utente(email),
  ristorante       INTEGER NOT NULL REFERENCES ristorante(codice),
  rider            INTEGER REFERENCES rider(codice),
  creato_il        TEXT NOT NULL,
  orario_recapito  TEXT NOT NULL,
  stato            TEXT NOT NULL CHECK (stato IN ('consegnato', 'annullato_utente', 'annullato_ristorante', 'in_consegna')),
  reclamo          INTEGER NOT NULL DEFAULT 0 CHECK (reclamo IN (0, 1)),
  totale           REAL NOT NULL
);

CREATE TABLE ordine_portata (
  ordine   INTEGER NOT NULL REFERENCES ordine(id),
  portata  INTEGER NOT NULL REFERENCES portata(id),
  quantita INTEGER NOT NULL CHECK (quantita > 0),
  PRIMARY KEY (ordine, portata)
);

CREATE TABLE recensione (
  id          INTEGER PRIMARY KEY,
  utente      TEXT NOT NULL REFERENCES utente(email),
  ristorante  INTEGER NOT NULL REFERENCES ristorante(codice),
  valutazione INTEGER NOT NULL CHECK (valutazione BETWEEN 1 AND 5),
  commento    TEXT,
  mancia      REAL NOT NULL DEFAULT 0
);
