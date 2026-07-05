# Hospishift — Gestione Turni Ospedalieri

App per la pianificazione, gestione e compliance dei turni del personale ospedaliero.

---

## Indice

- [Funzionalità](#funzionalità)
  - [Dashboard](#dashboard)
  - [Calendario turni](#calendario-turni)
  - [Gestione Personale](#gestione-personale)
  - [Gestione Reparti](#gestione-reparti)
  - [Richieste di cambio turno](#richieste-di-cambio-turno)
  - [Trovare un sostituto](#trovare-un-sostituto)
  - [Scoring priorità](#scoring-priorità)
- [Permessi e Ruoli](#permessi-e-ruoli)
- [Autenticazione](#autenticazione)
- [Tecnologie](#tecnologie)

---

## Funzionalità

### Dashboard

La dashboard offre una panoramica immediata della situazione odierna:

- **Statistiche** — numero di dipendenti, reparti, personale in turno oggi, in ferie oggi, turni totali della settimana
- **Copertura reparti** — per ogni reparto, barra di progressione che mostra quanti dei suoi dipendenti sono in turno oggi, con codice colore (rosso = 0%, arancione < 50%, giallo < 80%, verde ≥ 80%)
- **In ferie oggi** — elenco del personale in ferie, con tipo di ferie. Se nessuno oggi, mostra le ferie previste più avanti nella settimana
- **I miei prossimi turni** — se l'utente loggato corrisponde a un dipendente, mostra i suoi prossimi 3 turni
- **Richieste di cambio** — elenco delle richieste di swap pending, ordinate per priorità (chi ha chiesto meno volte viene prima). Visibile solo a chi ha permessi di gestione
- **Questa settimana** — griglia 7 giorni con conteggio turni per giorno, con evidenziazione del giorno corrente

### Calendario turni

Vista settimanale e mensile dei turni, con filtri per reparto e dipendente.

**Creazione turno:**
- Seleziona un dipendente → il reparto viene auto-impostato al suo reparto principale e diventa read-only
- Seleziona un reparto → l'elenco dipendenti viene filtrato a solo quelli appartenenti a quel reparto
- Scegli un template orario, tipo di copertura (Regular, On-call, Straordinario), data/ora e note

**Modifica turno:**
- Click su un turno esistente per modificarlo
- Pulsante "Check" per valutare la compliance senza salvare
- Pulsante "Find replacement" per cercare candidati alla sostituzione

### Trovare un sostituto

Quando un turno ha bisogno di copertura, il sistema cerca dipendenti con lo stesso ruolo che non abbiano violazioni di compliance. Per ogni candidato mostra:

- **OT Xm** — minuti di straordinario accumulati nel mese
- **OK** — il candidato è compliant (zero violazioni hard)
- **Numero** — conteggio di violazioni hard che si attiverebbero assegnandogli il turno

### Gestione Personale

Elenco del personale con ricerca, filtri per ruolo e contratto, ordinamento. Ogni dipendente ha:

- Nome, email, ruolo (Medico, Infermiere, OSS, Ostetrica...)
- Tipo di contratto (Full-time, Part-time, Libero professionista, Consulente esterno)
- FTE (0.1–1.0), anzianità, straordinario accumulato, ferie residue
- Assegnazione a uno o più reparti (con reparto principale)

### Gestione Reparti

Elenco dei reparti con nome, centro di costo e colore identificativo (usato visivamente nel calendario).

### Richieste di cambio turno

Sistema di scambio turni peer-to-peer con approvazione manageriale:

1. **Proposta** — un dipendente seleziona il proprio turno e quello del collega con cui scambiare
2. **Accettazione collega** — il collega può accettare o declinare
3. **Approvazione manager** — il manager verifica la compliance su entrambi i turni e approva lo scambio
4. **Esecuzione** — lo scambio viene eseguito atomicamente con aggiornamento dei dipendenti sui rispettivi turni

### Scoring priorità

Le richieste di cambio vengono ordinate per un punteggio di priorità calcolato come:

```
priority_score = 1 / (1 + numero_richieste_passate)
```

- Chi non ha mai chiesto un cambio: score = 1.0 (massima priorità)
- Chi ha chiesto 8 volte: score ≈ 0.11
- Chi ha chiesto 20 volte: score ≈ 0.048

Più alto è lo score, più larga è la barra di priorità nella dashboard. L'ordinamento è crescente: chi ha chiesto meno viene mostrato per primo.

---

## Permessi e Ruoli

| Ruolo | Descrizione |
|-------|-------------|
| **Super Admin** (`user_roles.admin`) | Accesso completo a tutti i tenant e tutte le funzionalità |
| **Owner** | Gestione completa del tenant, inclusi permessi e configurazione |
| **Manager** | Gestione turni, personale e approvazione cambi |
| **Planner** | Pianificazione turni, senza gestione personale |
| **Staff** | Visione del proprio calendario e richiesta cambi peer-to-peer |
| **Viewer** | Sola lettura |

I permessi specifici (calendar_manage, leaves_manage, ecc.) sono gestiti tramite la tabella `permissions` con chiave `permission_key`.

---

## Autenticazione

- Login con email/password (Supabase Auth)
- OAuth con Google e Apple
- L'utente `admin@hospishift.io` è automaticamente owner di tutti i tenant
- Ogni nuovo utente viene registrato come owner del tenant associato alla sua email

---

## Tecnologie

| Layer | Tecnologia |
|-------|-----------|
| Framework | React + TanStack Router + TanStack Start |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| UI | Tailwind CSS + shadcn/ui |
| Query | TanStack Query |
| Compliance | Motore custom di valutazione turni (violazioni hard/soft) |
| Tipi | TypeScript generato da Supabase |
| Pacchetto | npm / Vite |

---

## Sviluppo

```bash
npm install
npm run dev      # Avvia il dev server
npx tsc --noEmit # Type check
```
