       IDENTIFICATION DIVISION.
       PROGRAM-ID. CALC-JOURNAL.
      ******************************************************************
      * CALC-JOURNAL — Génération des écritures comptables PCG
      * Lit BULLETINS.dat et COTISATIONS-PATRONALES.dat
      * Produit JOURNAL-PCG.dat avec écritures équilibrées
      * Comptes PCG : 421, 431, 437, 4421, 512, 641x, 645x
      ******************************************************************
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT BULLETINS-FILE
               ASSIGN TO WS-BULLETINS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-BUL.

           SELECT COTISATIONS-FILE
               ASSIGN TO WS-COTISATIONS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-COT.

           SELECT JOURNAL-FILE
               ASSIGN TO WS-JOURNAL-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-JRN.

       DATA DIVISION.
       FILE SECTION.
       FD  BULLETINS-FILE.
       COPY "PAIE-RECORD.cpy".

       FD  COTISATIONS-FILE.
       COPY "COTISATION-RECORD.cpy".

       FD  JOURNAL-FILE.
       COPY "JOURNAL-RECORD.cpy".

       WORKING-STORAGE SECTION.
       01  WS-BULLETINS-PATH         PIC X(256).
       01  WS-COTISATIONS-PATH       PIC X(256).
       01  WS-JOURNAL-PATH           PIC X(256).

       01  WS-FS-BUL                 PIC XX.
       01  WS-FS-COT                 PIC XX.
       01  WS-FS-JRN                 PIC XX.

       01  WS-EOF-BUL                PIC 9 VALUE 0.
           88  EOF-BUL               VALUE 1.
       01  WS-EOF-COT                PIC 9 VALUE 0.
           88  EOF-COT               VALUE 1.

       01  WS-RECORDS-WRITTEN        PIC 9(6) VALUE 0.
       01  WS-ERRORS                 PIC 9(6) VALUE 0.
       01  WS-PIECE-NUM              PIC 9(6) VALUE 0.
       01  WS-PIECE-STR              PIC X(12).

      *    --- Totaux pour écritures agrégées ---
       01  WS-TOT-BRUT               PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-COT-SAL            PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-PAS                PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-NET                PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-COT-PAT            PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-MALADIE-PAT        PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-VIEILL-PAT         PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-RETR-PAT           PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-PREVOY-PAT         PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-ATMP-PAT           PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-CHOMAGE-PAT        PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-FNAL-PAT           PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-AGS-PAT            PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-PRIME              PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-HS                 PIC S9(11)V99 COMP-3 VALUE 0.
       01  WS-TOT-ABSENCE            PIC S9(11)V99 COMP-3 VALUE 0.

       01  WS-DATE-JRN               PIC 9(8).
       01  WS-TEMP-MONTANT           PIC S9(11)V99 COMP-3.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALISATION
           PERFORM 2000-TRAITEMENT-BULLETINS
           PERFORM 3000-TRAITEMENT-COTISATIONS
           PERFORM 4000-ECRITURES-AGREGEES
           PERFORM 9000-FIN
           STOP RUN.

      ******************************************************************
       1000-INITIALISATION.
      ******************************************************************
           ACCEPT WS-BULLETINS-PATH FROM ENVIRONMENT "BULLETINS_FILE"
           ACCEPT WS-COTISATIONS-PATH
               FROM ENVIRONMENT "COTISATIONS_FILE"
           ACCEPT WS-JOURNAL-PATH FROM ENVIRONMENT "JOURNAL_FILE"

           IF WS-BULLETINS-PATH = SPACES
               MOVE "../data/BULLETINS.dat" TO WS-BULLETINS-PATH
           END-IF
           IF WS-COTISATIONS-PATH = SPACES
               MOVE "../data/COTISATIONS-PATRONALES.dat"
                   TO WS-COTISATIONS-PATH
           END-IF
           IF WS-JOURNAL-PATH = SPACES
               MOVE "../data/JOURNAL-PCG.dat" TO WS-JOURNAL-PATH
           END-IF

           OPEN INPUT BULLETINS-FILE
           IF WS-FS-BUL NOT = "00"
               DISPLAY "CALC-JOURNAL|ERROR|0|OPEN-BUL=" WS-FS-BUL
               STOP RUN
           END-IF

           OPEN INPUT COTISATIONS-FILE
           IF WS-FS-COT NOT = "00"
               DISPLAY "CALC-JOURNAL|ERROR|0|OPEN-COT=" WS-FS-COT
               CLOSE BULLETINS-FILE
               STOP RUN
           END-IF

           OPEN OUTPUT JOURNAL-FILE
           IF WS-FS-JRN NOT = "00"
               DISPLAY "CALC-JOURNAL|ERROR|0|OPEN-JRN=" WS-FS-JRN
               CLOSE BULLETINS-FILE
               CLOSE COTISATIONS-FILE
               STOP RUN
           END-IF

           DISPLAY "CALC-JOURNAL|START|0|0".

      ******************************************************************
       2000-TRAITEMENT-BULLETINS.
      ******************************************************************
      *    Pour chaque bulletin : écritures salaires bruts,
      *    cotisations salariales, PAS, net à payer
           READ BULLETINS-FILE
               AT END SET EOF-BUL TO TRUE
           END-READ

           PERFORM UNTIL EOF-BUL
               MOVE PAI-DATE-PAIEMENT TO WS-DATE-JRN
               ADD 1 TO WS-PIECE-NUM
               MOVE WS-PIECE-NUM TO WS-PIECE-STR

      *        --- Débit 6411 / Crédit 421 : Salaires bruts ---
               PERFORM 2100-ECRITURE-SALAIRE-BRUT

      *        --- Débit 6413 / Crédit 421 : Primes ---
               IF PAI-PRIME-ANCIENNETE > 0 OR PAI-PRIME-EXCEPT > 0
                   PERFORM 2200-ECRITURE-PRIMES
               END-IF

      *        --- Débit 6412 / Crédit 421 : Heures supplémentaires ---
               IF PAI-MONTANT-HS-25 > 0 OR PAI-MONTANT-HS-50 > 0
                   PERFORM 2250-ECRITURE-HS
               END-IF

      *        --- Débit 421 / Crédit 6411 : Déduction absences ---
               IF PAI-ABSENCE-MONTANT > 0
                   PERFORM 2270-ECRITURE-ABSENCE
               END-IF

      *        --- Débit 421 / Crédit 431 : Cotisations salariales ---
               PERFORM 2300-ECRITURE-COT-SAL

      *        --- Débit 421 / Crédit 4421 : PAS ---
               IF PAI-MONTANT-PAS > 0
                   PERFORM 2400-ECRITURE-PAS
               END-IF

      *        --- Débit 421 / Crédit 512 : Net à payer ---
               PERFORM 2500-ECRITURE-NET

      *        Accumuler totaux
               ADD PAI-SALAIRE-BASE TO WS-TOT-BRUT
               COMPUTE WS-TEMP-MONTANT =
                   PAI-PRIME-ANCIENNETE + PAI-PRIME-EXCEPT
               ADD WS-TEMP-MONTANT TO WS-TOT-PRIME
               COMPUTE WS-TEMP-MONTANT =
                   PAI-MONTANT-HS-25 + PAI-MONTANT-HS-50
               ADD WS-TEMP-MONTANT TO WS-TOT-HS
               ADD PAI-ABSENCE-MONTANT TO WS-TOT-ABSENCE
               ADD PAI-TOTAL-COT-SAL TO WS-TOT-COT-SAL
               ADD PAI-MONTANT-PAS TO WS-TOT-PAS
               ADD PAI-NET-A-PAYER TO WS-TOT-NET

               READ BULLETINS-FILE
                   AT END SET EOF-BUL TO TRUE
               END-READ
           END-PERFORM.

      ******************************************************************
       2100-ECRITURE-SALAIRE-BRUT.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "6411  "             TO JRN-COMPTE-DEBIT
           MOVE "421   "             TO JRN-COMPTE-CREDIT
           MOVE PAI-SALAIRE-BASE     TO JRN-MONTANT
           MOVE "Remuneration due"   TO JRN-LIBELLE
           MOVE "SAL"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2200-ECRITURE-PRIMES.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "6413  "             TO JRN-COMPTE-DEBIT
           MOVE "421   "             TO JRN-COMPTE-CREDIT
           COMPUTE JRN-MONTANT =
               PAI-PRIME-ANCIENNETE + PAI-PRIME-EXCEPT
           MOVE "Primes"             TO JRN-LIBELLE
           MOVE "SAL"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2250-ECRITURE-HS.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "6412  "             TO JRN-COMPTE-DEBIT
           MOVE "421   "             TO JRN-COMPTE-CREDIT
           COMPUTE JRN-MONTANT =
               PAI-MONTANT-HS-25 + PAI-MONTANT-HS-50
           MOVE "Heures supplementaires"
                                     TO JRN-LIBELLE
           MOVE "SAL"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2270-ECRITURE-ABSENCE.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "6411  "             TO JRN-COMPTE-DEBIT
           MOVE "421   "             TO JRN-COMPTE-CREDIT
           COMPUTE JRN-MONTANT = 0 - PAI-ABSENCE-MONTANT
           MOVE "Deduction absences" TO JRN-LIBELLE
           MOVE "SAL"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2300-ECRITURE-COT-SAL.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "431   "             TO JRN-COMPTE-CREDIT
           MOVE PAI-TOTAL-COT-SAL    TO JRN-MONTANT
           MOVE "Retenues sociales"  TO JRN-LIBELLE
           MOVE "COT"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2400-ECRITURE-PAS.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "4421  "             TO JRN-COMPTE-CREDIT
           MOVE PAI-MONTANT-PAS      TO JRN-MONTANT
           MOVE "Prelevement a la source"
                                     TO JRN-LIBELLE
           MOVE "PAS"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       2500-ECRITURE-NET.
      ******************************************************************
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE PAI-MATRICULE        TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "512   "             TO JRN-COMPTE-CREDIT
           MOVE PAI-NET-A-PAYER      TO JRN-MONTANT
           MOVE "Virement salaire"   TO JRN-LIBELLE
           MOVE "NET"                TO JRN-TYPE-ECRITURE

           WRITE JOURNAL-RECORD
           IF WS-FS-JRN NOT = "00"
               ADD 1 TO WS-ERRORS
           END-IF
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       3000-TRAITEMENT-COTISATIONS.
      ******************************************************************
      *    Écritures patronales par employé
           READ COTISATIONS-FILE
               AT END SET EOF-COT TO TRUE
           END-READ

           PERFORM UNTIL EOF-COT
               ADD 1 TO WS-PIECE-NUM
               MOVE WS-PIECE-NUM TO WS-PIECE-STR

      *        --- Débit 6451 / Crédit 431 : URSSAF patronal ---
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN          TO JRN-DATE
               MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
               MOVE COT-MATRICULE        TO JRN-MATRICULE
               MOVE "6451  "             TO JRN-COMPTE-DEBIT
               MOVE "431   "             TO JRN-COMPTE-CREDIT
               COMPUTE JRN-MONTANT =
                   COT-MALADIE-PAT + COT-VIEILL-PLAF-PAT
                   + COT-VIEILL-DEPLAF-PAT + COT-ALLOC-FAM-PAT
                   + COT-FNAL-PAT + COT-CHOMAGE-PAT + COT-AGS-PAT
               MOVE "Charges patronales URSSAF"
                                         TO JRN-LIBELLE
               MOVE "PAT"                TO JRN-TYPE-ECRITURE

               ADD JRN-MONTANT TO WS-TOT-COT-PAT

               WRITE JOURNAL-RECORD
               IF WS-FS-JRN NOT = "00"
                   ADD 1 TO WS-ERRORS
               END-IF
               ADD 1 TO WS-RECORDS-WRITTEN

      *        --- Débit 6452 / Crédit 437 : Retraite patronal ---
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN          TO JRN-DATE
               MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
               MOVE COT-MATRICULE        TO JRN-MATRICULE
               MOVE "6452  "             TO JRN-COMPTE-DEBIT
               MOVE "437   "             TO JRN-COMPTE-CREDIT
               COMPUTE JRN-MONTANT =
                   COT-RETR-T1-PAT + COT-RETR-T2-PAT
                   + COT-CEG-T1-PAT + COT-CEG-T2-PAT
               MOVE "Retraite complementaire pat"
                                         TO JRN-LIBELLE
               MOVE "PAT"                TO JRN-TYPE-ECRITURE

               ADD JRN-MONTANT TO WS-TOT-COT-PAT

               WRITE JOURNAL-RECORD
               IF WS-FS-JRN NOT = "00"
                   ADD 1 TO WS-ERRORS
               END-IF
               ADD 1 TO WS-RECORDS-WRITTEN

      *        --- Débit 6454 / Crédit 431 : AT/MP patronal ---
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN          TO JRN-DATE
               MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
               MOVE COT-MATRICULE        TO JRN-MATRICULE
               MOVE "6454  "             TO JRN-COMPTE-DEBIT
               MOVE "431   "             TO JRN-COMPTE-CREDIT
               MOVE COT-ATMP-PAT         TO JRN-MONTANT
               MOVE "Accidents du travail"
                                         TO JRN-LIBELLE
               MOVE "PAT"                TO JRN-TYPE-ECRITURE

               ADD JRN-MONTANT TO WS-TOT-COT-PAT

               WRITE JOURNAL-RECORD
               IF WS-FS-JRN NOT = "00"
                   ADD 1 TO WS-ERRORS
               END-IF
               ADD 1 TO WS-RECORDS-WRITTEN

      *        --- Débit 6453 / Crédit 437 : Prévoyance patronal ---
               IF COT-PREVOY-PAT > 0
                   INITIALIZE JOURNAL-RECORD
                   MOVE WS-DATE-JRN      TO JRN-DATE
                   MOVE WS-PIECE-STR     TO JRN-NUMERO-PIECE
                   MOVE COT-MATRICULE    TO JRN-MATRICULE
                   MOVE "6453  "         TO JRN-COMPTE-DEBIT
                   MOVE "437   "         TO JRN-COMPTE-CREDIT
                   MOVE COT-PREVOY-PAT   TO JRN-MONTANT
                   MOVE "Prevoyance patronale"
                                         TO JRN-LIBELLE
                   MOVE "PAT"            TO JRN-TYPE-ECRITURE

                   ADD JRN-MONTANT TO WS-TOT-COT-PAT

                   WRITE JOURNAL-RECORD
                   IF WS-FS-JRN NOT = "00"
                       ADD 1 TO WS-ERRORS
                   END-IF
                   ADD 1 TO WS-RECORDS-WRITTEN
               END-IF

               READ COTISATIONS-FILE
                   AT END SET EOF-COT TO TRUE
               END-READ
           END-PERFORM.

      ******************************************************************
       4000-ECRITURES-AGREGEES.
      ******************************************************************
      *    Écriture de totalisation — type TOT
           ADD 1 TO WS-PIECE-NUM
           MOVE WS-PIECE-NUM TO WS-PIECE-STR

      *    Total salaires bruts
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE "TOTAL   "           TO JRN-MATRICULE
           MOVE "6411  "             TO JRN-COMPTE-DEBIT
           MOVE "421   "             TO JRN-COMPTE-CREDIT
           MOVE WS-TOT-BRUT          TO JRN-MONTANT
           MOVE "TOTAL Remunerations dues"
                                     TO JRN-LIBELLE
           MOVE "TOT"                TO JRN-TYPE-ECRITURE
           WRITE JOURNAL-RECORD
           ADD 1 TO WS-RECORDS-WRITTEN

      *    Total primes
           IF WS-TOT-PRIME > 0
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN      TO JRN-DATE
               MOVE WS-PIECE-STR     TO JRN-NUMERO-PIECE
               MOVE "TOTAL   "       TO JRN-MATRICULE
               MOVE "6413  "         TO JRN-COMPTE-DEBIT
               MOVE "421   "         TO JRN-COMPTE-CREDIT
               MOVE WS-TOT-PRIME     TO JRN-MONTANT
               MOVE "TOTAL Primes"   TO JRN-LIBELLE
               MOVE "TOT"            TO JRN-TYPE-ECRITURE
               WRITE JOURNAL-RECORD
               ADD 1 TO WS-RECORDS-WRITTEN
           END-IF

      *    Total heures supplementaires
           IF WS-TOT-HS > 0
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN      TO JRN-DATE
               MOVE WS-PIECE-STR     TO JRN-NUMERO-PIECE
               MOVE "TOTAL   "       TO JRN-MATRICULE
               MOVE "6412  "         TO JRN-COMPTE-DEBIT
               MOVE "421   "         TO JRN-COMPTE-CREDIT
               MOVE WS-TOT-HS        TO JRN-MONTANT
               MOVE "TOTAL Heures supplementaires"
                                      TO JRN-LIBELLE
               MOVE "TOT"            TO JRN-TYPE-ECRITURE
               WRITE JOURNAL-RECORD
               ADD 1 TO WS-RECORDS-WRITTEN
           END-IF

      *    Total deductions absences
           IF WS-TOT-ABSENCE > 0
               INITIALIZE JOURNAL-RECORD
               MOVE WS-DATE-JRN      TO JRN-DATE
               MOVE WS-PIECE-STR     TO JRN-NUMERO-PIECE
               MOVE "TOTAL   "       TO JRN-MATRICULE
               MOVE "6411  "         TO JRN-COMPTE-DEBIT
               MOVE "421   "         TO JRN-COMPTE-CREDIT
               COMPUTE JRN-MONTANT = 0 - WS-TOT-ABSENCE
               MOVE "TOTAL Deductions absences"
                                      TO JRN-LIBELLE
               MOVE "TOT"            TO JRN-TYPE-ECRITURE
               WRITE JOURNAL-RECORD
               ADD 1 TO WS-RECORDS-WRITTEN
           END-IF

      *    Total cotisations salariales
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE "TOTAL   "           TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "431   "             TO JRN-COMPTE-CREDIT
           MOVE WS-TOT-COT-SAL       TO JRN-MONTANT
           MOVE "TOTAL Retenues sociales"
                                     TO JRN-LIBELLE
           MOVE "TOT"                TO JRN-TYPE-ECRITURE
           WRITE JOURNAL-RECORD
           ADD 1 TO WS-RECORDS-WRITTEN

      *    Total PAS
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE "TOTAL   "           TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "4421  "             TO JRN-COMPTE-CREDIT
           MOVE WS-TOT-PAS           TO JRN-MONTANT
           MOVE "TOTAL Prelevement source"
                                     TO JRN-LIBELLE
           MOVE "TOT"                TO JRN-TYPE-ECRITURE
           WRITE JOURNAL-RECORD
           ADD 1 TO WS-RECORDS-WRITTEN

      *    Total net à payer
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE "TOTAL   "           TO JRN-MATRICULE
           MOVE "421   "             TO JRN-COMPTE-DEBIT
           MOVE "512   "             TO JRN-COMPTE-CREDIT
           MOVE WS-TOT-NET           TO JRN-MONTANT
           MOVE "TOTAL Virements salaires"
                                     TO JRN-LIBELLE
           MOVE "TOT"                TO JRN-TYPE-ECRITURE
           WRITE JOURNAL-RECORD
           ADD 1 TO WS-RECORDS-WRITTEN

      *    Total charges patronales
           INITIALIZE JOURNAL-RECORD
           MOVE WS-DATE-JRN          TO JRN-DATE
           MOVE WS-PIECE-STR         TO JRN-NUMERO-PIECE
           MOVE "TOTAL   "           TO JRN-MATRICULE
           MOVE "645   "             TO JRN-COMPTE-DEBIT
           MOVE "431   "             TO JRN-COMPTE-CREDIT
           MOVE WS-TOT-COT-PAT       TO JRN-MONTANT
           MOVE "TOTAL Charges patronales"
                                     TO JRN-LIBELLE
           MOVE "TOT"                TO JRN-TYPE-ECRITURE
           WRITE JOURNAL-RECORD
           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       9000-FIN.
      ******************************************************************
           CLOSE BULLETINS-FILE
           CLOSE COTISATIONS-FILE
           CLOSE JOURNAL-FILE

           DISPLAY "CALC-JOURNAL|DONE|" WS-RECORDS-WRITTEN
               "|" WS-ERRORS.
