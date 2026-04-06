       IDENTIFICATION DIVISION.
       PROGRAM-ID. REPORT-MASSE-SALARIALE.
      ******************************************************************
      * REPORT-MASSE-SALARIALE — Rapport masse salariale par département
      * Lit BULLETINS.dat et COTISATIONS-PATRONALES.dat
      * Produit RAPPORT-MASSE.dat : 1 ligne par dept + 1 total général
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

           SELECT RAPPORT-FILE
               ASSIGN TO WS-RAPPORT-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-RPT.

       DATA DIVISION.
       FILE SECTION.
       FD  BULLETINS-FILE.
       COPY "PAIE-RECORD.cpy".

       FD  COTISATIONS-FILE.
       COPY "COTISATION-RECORD.cpy".

       FD  RAPPORT-FILE.
       01  RAPPORT-RECORD.
           05  RPT-DEPARTEMENT       PIC X(12).
           05  RPT-EFFECTIF          PIC 9(4).
           05  RPT-BRUT-TOTAL        PIC S9(11)V99 COMP-3.
           05  RPT-COT-SAL-TOTAL     PIC S9(11)V99 COMP-3.
           05  RPT-COT-PAT-TOTAL     PIC S9(11)V99 COMP-3.
           05  RPT-NET-TOTAL         PIC S9(11)V99 COMP-3.
           05  RPT-PAS-TOTAL         PIC S9(11)V99 COMP-3.
           05  RPT-COUT-EMPLOYEUR    PIC S9(11)V99 COMP-3.
           05  FILLER                PIC X(46).

       WORKING-STORAGE SECTION.
       01  WS-BULLETINS-PATH         PIC X(256).
       01  WS-COTISATIONS-PATH       PIC X(256).
       01  WS-RAPPORT-PATH           PIC X(256).
       01  WS-FS-BUL                 PIC XX.
       01  WS-FS-COT                 PIC XX.
       01  WS-FS-RPT                 PIC XX.
       01  WS-EOF-BUL                PIC 9 VALUE 0.
           88  EOF-BUL               VALUE 1.
       01  WS-EOF-COT                PIC 9 VALUE 0.
           88  EOF-COT               VALUE 1.
       01  WS-RECORDS                PIC 9(6) VALUE 0.
       01  WS-ERRORS                 PIC 9(6) VALUE 0.

      *    --- Accumulateurs par département ---
      *    Index: 1=COMMERCIAL, 2=TECHNIQUE, 3=RH, 4=DIRECTION
       01  WS-DEPT-TABLE.
           05  WS-DEPT-ENTRY OCCURS 4 TIMES.
               10  WS-DEPT-NOM       PIC X(12).
               10  WS-DEPT-EFF       PIC 9(4).
               10  WS-DEPT-BRUT      PIC S9(11)V99 COMP-3.
               10  WS-DEPT-COT-SAL   PIC S9(11)V99 COMP-3.
               10  WS-DEPT-COT-PAT   PIC S9(11)V99 COMP-3.
               10  WS-DEPT-NET       PIC S9(11)V99 COMP-3.
               10  WS-DEPT-PAS       PIC S9(11)V99 COMP-3.

       01  WS-IDX                    PIC 9.
       01  WS-I                      PIC 9.

      *    --- Grand total ---
       01  WS-GRAND-TOTAL.
           05  WS-GT-EFF             PIC 9(4) VALUE 0.
           05  WS-GT-BRUT            PIC S9(11)V99 COMP-3 VALUE 0.
           05  WS-GT-COT-SAL         PIC S9(11)V99 COMP-3 VALUE 0.
           05  WS-GT-COT-PAT         PIC S9(11)V99 COMP-3 VALUE 0.
           05  WS-GT-NET             PIC S9(11)V99 COMP-3 VALUE 0.
           05  WS-GT-PAS             PIC S9(11)V99 COMP-3 VALUE 0.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALISATION
           PERFORM 2000-TRAITEMENT-BULLETINS
           PERFORM 3000-TRAITEMENT-COTISATIONS
           PERFORM 4000-ECRIRE-RAPPORT
           PERFORM 9000-FIN
           STOP RUN.

      ******************************************************************
       1000-INITIALISATION.
      ******************************************************************
           ACCEPT WS-BULLETINS-PATH FROM ENVIRONMENT "BULLETINS_FILE"
           ACCEPT WS-COTISATIONS-PATH
               FROM ENVIRONMENT "COTISATIONS_FILE"
           ACCEPT WS-RAPPORT-PATH FROM ENVIRONMENT "RAPPORT_FILE"

           IF WS-BULLETINS-PATH = SPACES
               MOVE "../data/BULLETINS.dat" TO WS-BULLETINS-PATH
           END-IF
           IF WS-COTISATIONS-PATH = SPACES
               MOVE "../data/COTISATIONS-PATRONALES.dat"
                   TO WS-COTISATIONS-PATH
           END-IF
           IF WS-RAPPORT-PATH = SPACES
               MOVE "../data/RAPPORT-MASSE.dat" TO WS-RAPPORT-PATH
           END-IF

      *    Initialize department names
           MOVE "COMMERCIAL  " TO WS-DEPT-NOM(1)
           MOVE "TECHNIQUE   " TO WS-DEPT-NOM(2)
           MOVE "RH          " TO WS-DEPT-NOM(3)
           MOVE "DIRECTION   " TO WS-DEPT-NOM(4)

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 4
               MOVE 0 TO WS-DEPT-EFF(WS-I)
               MOVE 0 TO WS-DEPT-BRUT(WS-I)
               MOVE 0 TO WS-DEPT-COT-SAL(WS-I)
               MOVE 0 TO WS-DEPT-COT-PAT(WS-I)
               MOVE 0 TO WS-DEPT-NET(WS-I)
               MOVE 0 TO WS-DEPT-PAS(WS-I)
           END-PERFORM

           OPEN INPUT BULLETINS-FILE
           IF WS-FS-BUL NOT = "00"
               DISPLAY "REPORT-MASSE|ERROR|0|OPEN-BUL=" WS-FS-BUL
               STOP RUN
           END-IF

           OPEN INPUT COTISATIONS-FILE
           IF WS-FS-COT NOT = "00"
               DISPLAY "REPORT-MASSE|ERROR|0|OPEN-COT=" WS-FS-COT
               CLOSE BULLETINS-FILE
               STOP RUN
           END-IF

           OPEN OUTPUT RAPPORT-FILE
           IF WS-FS-RPT NOT = "00"
               DISPLAY "REPORT-MASSE|ERROR|0|OPEN-RPT=" WS-FS-RPT
               CLOSE BULLETINS-FILE
               CLOSE COTISATIONS-FILE
               STOP RUN
           END-IF

           DISPLAY "REPORT-MASSE|START|0|0".

      ******************************************************************
       2000-TRAITEMENT-BULLETINS.
      ******************************************************************
           READ BULLETINS-FILE
               AT END SET EOF-BUL TO TRUE
           END-READ

           PERFORM UNTIL EOF-BUL
               PERFORM 2100-FIND-DEPT-IDX

               IF WS-IDX > 0 AND WS-IDX < 5
                   ADD 1 TO WS-DEPT-EFF(WS-IDX)
                   ADD PAI-BRUT TO WS-DEPT-BRUT(WS-IDX)
                   ADD PAI-TOTAL-COT-SAL
                       TO WS-DEPT-COT-SAL(WS-IDX)
                   ADD PAI-NET-A-PAYER TO WS-DEPT-NET(WS-IDX)
                   ADD PAI-MONTANT-PAS TO WS-DEPT-PAS(WS-IDX)
               ELSE
                   ADD 1 TO WS-ERRORS
               END-IF

               READ BULLETINS-FILE
                   AT END SET EOF-BUL TO TRUE
               END-READ
           END-PERFORM.

      ******************************************************************
       2100-FIND-DEPT-IDX.
      ******************************************************************
           MOVE 0 TO WS-IDX
           EVALUATE PAI-DEPARTEMENT
               WHEN "COMMERCIAL  " MOVE 1 TO WS-IDX
               WHEN "TECHNIQUE   " MOVE 2 TO WS-IDX
               WHEN "RH          " MOVE 3 TO WS-IDX
               WHEN "DIRECTION   " MOVE 4 TO WS-IDX
               WHEN OTHER MOVE 0 TO WS-IDX
           END-EVALUATE.

      ******************************************************************
       3000-TRAITEMENT-COTISATIONS.
      ******************************************************************
           READ COTISATIONS-FILE
               AT END SET EOF-COT TO TRUE
           END-READ

           PERFORM UNTIL EOF-COT
               EVALUATE COT-DEPARTEMENT
                   WHEN "COMMERCIAL  " MOVE 1 TO WS-IDX
                   WHEN "TECHNIQUE   " MOVE 2 TO WS-IDX
                   WHEN "RH          " MOVE 3 TO WS-IDX
                   WHEN "DIRECTION   " MOVE 4 TO WS-IDX
                   WHEN OTHER MOVE 0 TO WS-IDX
               END-EVALUATE

               IF WS-IDX > 0 AND WS-IDX < 5
                   ADD COT-TOTAL-PAT TO WS-DEPT-COT-PAT(WS-IDX)
               END-IF

               READ COTISATIONS-FILE
                   AT END SET EOF-COT TO TRUE
               END-READ
           END-PERFORM.

      ******************************************************************
       4000-ECRIRE-RAPPORT.
      ******************************************************************
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 4
               INITIALIZE RAPPORT-RECORD
               MOVE WS-DEPT-NOM(WS-I) TO RPT-DEPARTEMENT
               MOVE WS-DEPT-EFF(WS-I) TO RPT-EFFECTIF
               MOVE WS-DEPT-BRUT(WS-I) TO RPT-BRUT-TOTAL
               MOVE WS-DEPT-COT-SAL(WS-I) TO RPT-COT-SAL-TOTAL
               MOVE WS-DEPT-COT-PAT(WS-I) TO RPT-COT-PAT-TOTAL
               MOVE WS-DEPT-NET(WS-I) TO RPT-NET-TOTAL
               MOVE WS-DEPT-PAS(WS-I) TO RPT-PAS-TOTAL
               COMPUTE RPT-COUT-EMPLOYEUR =
                   WS-DEPT-BRUT(WS-I) + WS-DEPT-COT-PAT(WS-I)

               WRITE RAPPORT-RECORD
               IF WS-FS-RPT NOT = "00"
                   ADD 1 TO WS-ERRORS
               END-IF
               ADD 1 TO WS-RECORDS

      *        Accumulate grand totals
               ADD WS-DEPT-EFF(WS-I) TO WS-GT-EFF
               ADD WS-DEPT-BRUT(WS-I) TO WS-GT-BRUT
               ADD WS-DEPT-COT-SAL(WS-I) TO WS-GT-COT-SAL
               ADD WS-DEPT-COT-PAT(WS-I) TO WS-GT-COT-PAT
               ADD WS-DEPT-NET(WS-I) TO WS-GT-NET
               ADD WS-DEPT-PAS(WS-I) TO WS-GT-PAS
           END-PERFORM

      *    Grand total row
           INITIALIZE RAPPORT-RECORD
           MOVE "TOTAL       " TO RPT-DEPARTEMENT
           MOVE WS-GT-EFF TO RPT-EFFECTIF
           MOVE WS-GT-BRUT TO RPT-BRUT-TOTAL
           MOVE WS-GT-COT-SAL TO RPT-COT-SAL-TOTAL
           MOVE WS-GT-COT-PAT TO RPT-COT-PAT-TOTAL
           MOVE WS-GT-NET TO RPT-NET-TOTAL
           MOVE WS-GT-PAS TO RPT-PAS-TOTAL
           COMPUTE RPT-COUT-EMPLOYEUR =
               WS-GT-BRUT + WS-GT-COT-PAT

           WRITE RAPPORT-RECORD
           ADD 1 TO WS-RECORDS.

      ******************************************************************
       9000-FIN.
      ******************************************************************
           CLOSE BULLETINS-FILE
           CLOSE COTISATIONS-FILE
           CLOSE RAPPORT-FILE

           DISPLAY "REPORT-MASSE|DONE|" WS-RECORDS "|" WS-ERRORS.
