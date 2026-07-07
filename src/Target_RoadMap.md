# Specifiche Tecniche e Requisiti Minimi: Piattaforma Enterprise Gestione Turni Sanitari

Questo documento definisce i requisiti funzionali, tecnici e di sicurezza minimi per la piattaforma cloud multi-tenant dedicata alla pianificazione e gestione automatizzata dei turni di lavoro all'interno di strutture sanitarie e ospedaliere a livello Enterprise (2.000 - 5.000+ dipendenti).

---

## 1. Compliance Legale e Vincoli Contrattuali (Automazione Normativa)
Il motore di pianificazione deve garantire la totale aderenza alle normative europee, nazionali e ai Contratti Collettivi Nazionali di Lavoro (CCNL Sanità Pubblica, AIOP, ARAN). Il sistema deve impedire fisicamente la validazione di turni non conformi.

*   **Blocco Direttiva UE 2003/88/CE (Riposo delle 11 ore):** Controllo stringente sul riposo minimo consecutivo di 11 ore nelle 24 ore. Il sistema deve inibire l'assegnazione di un turno che violi questa finestra temporale rispetto al turno precedente.
*   **Tetti Orari e Straordinari:** Monitoraggio automatico del limite massimo di 48 ore lavorative settimanali medie (comprensive di straordinari). Generazione di alert preventivi al superamento della soglia.
*   **Gestione Pronta Disponibilità e Reperibilità:** Logiche dedicate per i turni di reperibilità attiva e passiva. Gestione del passaggio automatico da "reperibile" a "turno attivo/chiamata" con ricalcolo immediato dei riposi compensativi.
*   **Algoritmo di Equità Distributiva:** Tracciamento storico delle assegnazioni per garantire una distribuzione equa e bilanciata dei turni festivi, notturni e dei weekend tra tutto lo staff del reparto, riducendo i conflitti sindacali.

---

## 2. Architettura Enterprise, Ruoli e Integrazioni API
La piattaforma deve integrarsi nativamente nell'ecosistema software e hardware preesistente della struttura sanitaria senza richiedere modifiche infrastrutturali al cliente.

*   **Integrazione Hardware Controlli Presenze (Badge):** Disponibilità di API RESTful bidirezionali per comunicare in tempo reale con i terminali di timbratura fisici (es. sistemi Zucchetti, Kronos, ecc.). Il sistema deve evidenziare istantaneamente scostamenti tra il pianificato e l'effettivo (ritardi, uscite anticipate, assenze).
*   **Modulo Export Payroll (Ufficio Risorse Umane):** Generazione ed esportazione automatica di tracciati record formattati (CSV, Excel o formati piatti proprietari) pronti per l'importazione diretta nei gestionali di elaborazione buste paga/cedolini a fine mese.
*   **Controllo degli Accessi Basato sui Ruoli Gerarchici (Hierarchical RBAC):**
    *   *Super Admin (Direzione Sanitaria / HR):* Visione globale di tutti i presidi, reportistica macro sui costi, trend delle assenze e gestione delle configurazioni globali.
    *   *Department Admin (Caposala / Coordinatore di Reparto):* Gestione e modifica operativa della sola turnistica dei reparti di competenza (es. solo Pronto Soccorso), approvazione di ferie, permessi e cambi turno dello staff assegnato.
    *   *User (Dipendente/Professionista Sanitario):* Accesso in sola lettura al proprio calendario turni, visualizzazione dei colleghi in servizio nello stesso quadrante, e inserimento di desiderata o richieste di scambio.

---

## 3. Core Engine di Pianificazione Avanzata e Gestione Reparti
Il software deve basare la pianificazione sulla disponibilità delle competenze e sulla sicurezza clinica del reparto, non sulla semplice assegnazione di anagrafiche.

*   **Matrice delle Competenze (Skill Matrix Aziendale):** Definizione dei requisiti minimi di sicurezza per ogni quadrante orario (Mattina/Pomeriggio/Notte) per singolo reparto. 
    *   *Esempio:* Il sistema deve validare il turno di Rianimazione solo se sono presenti contemporaneamente almeno 1 Medico Rianimatore Senior, 1 Anestesista e 2 Infermieri di Area Critica. In caso contrario, il turno viene contrassegnato visivamente come "Scoperto / Non in Sicurezza".
*   **Gestione Sostituzioni Urgenti e Reperibili:** In caso di assenza improvvisa (es. malattia improvvisa prima del turno notturno), il sistema deve proporre una lista ristretta di dipendenti idonei, filtrati automaticamente per: qualifica necessaria, capienza contrattuale (che non violino le 11 ore di riposo) e vicinanza geografica o stato di reperibilità.
*   **Algoritmo di Auto-Scheduling (Opzionale/Avanzato):** Motore algoritmico euristico in grado di generare la bozza della turnistica mensile di un intero reparto con un singolo click, ottimizzando la copertura dei quadranti e rispettando le ferie approvate e i vincoli di legge.

---

## 4. Interfaccia Utente (UI/UX) ed Ecosistema Mobile
L'usabilità rappresenta il principale fattore di successo per l'adozione del software da parte del personale sanitario, minimizzando i costi di formazione.

*   **Pannello Admin "Drag & Drop" ad Alte Prestazioni:** Interfaccia desktop per i coordinatori fluida e reattiva (sviluppata con tecnologie frontend di ultima generazione). Consente lo spostamento dei turni tramite trascinamento, la duplicazione di pattern settimanali/mensili e il calcolo dei conflitti normativi in tempo reale senza ricaricamento della pagina.
*   **Applicazione Mobile per i Dipendenti (iOS / Android):** Web App ottimizzata (PWA) o App nativa per la forza lavoro, focalizzata su:
    *   Visualizzazione chiara del calendario turni e delle reperibilità.
    *   Ricezione di notifiche push istantanee per modifiche dell'ultimo minuto o richieste di sostituzione.
    *   **Modulo Scambio Turno Peer-to-Peer:** Possibilità per i dipendenti di proporre autonomamente uno scambio turno a un collega di pari livello direttamente dall'app. Se il collega accetta, la richiesta passa automaticamente al Caposala per l'approvazione finale con un click.

---

## 5. Sicurezza, Infrastruttura Cloud e Tracciabilità (GDPR)
Trattando dati inerenti alla pianificazione lavorativa e assenze per motivi personali (malattie, Legge 104, tutele genitoriali), la piattaforma deve garantire i massimi standard di sicurezza Enterprise.

*   **Isolamento Multi-Tenant Rigido:** Architettura software progettata per garantire l'isolamento logico e/o fisico dei dati tra diverse strutture sanitarie (o diversi presidi autonomi). Nessuna contaminazione o leak di dati deve essere possibile a livello di database.
*   **Registro dei Log e Tracciabilità Totale (Audit Trail):** Ogni singola azione di scrittura, modifica o cancellazione sui turni deve essere registrata in un log immutabile. Il sistema deve conservare data, ora, indirizzo IP e utente autore della modifica (es. *"Chi ha rimosso il Dott. Verdi dalla reperibilità del 14/03?"*).
*   **Elevata Disponibilità e Ridondanza (SLA 99.9%):** Hosting su infrastruttura Cloud ad alte prestazioni (es. Microsoft Azure / AWS) con ridondanza geografica, backup orari automatizzati e piano di Disaster Recovery documentato per garantire la continuità operativa dei reparti 24/7/365.
*   **Crittografia dei Dati:** Cifratura dei dati a riposo (Data at Rest) e in transito (Data in Transit) tramite protocolli HTTPS e TLS di ultima generazione. Conformance totale ai requisiti GDPR per il trattamento dei dati del personale.