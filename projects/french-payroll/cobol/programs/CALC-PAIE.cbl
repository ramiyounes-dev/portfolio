       IDENTIFICATION DIVISION.
       PROGRAM-ID. CALC-PAIE.
      ******************************************************************
      * CALC-PAIE — Calcul de la paie mensuelle
      * Lit EMPLOYEES.dat (indexé) et VARIABLES-PAIE.dat (séquentiel)
      * Produit BULLETINS.dat et COTISATIONS-PATRONALES.dat
      * Applique les cotisations sociales conformes au droit français
      ******************************************************************
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT EMPLOYEE-FILE
               ASSIGN TO WS-EMPLOYEE-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS EMP-MATRICULE
               FILE STATUS IS WS-FS-EMP.

           SELECT VARIABLES-FILE
               ASSIGN TO WS-VARIABLES-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-VAR.

           SELECT BULLETINS-FILE
               ASSIGN TO WS-BULLETINS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-BUL.

           SELECT COTISATIONS-FILE
               ASSIGN TO WS-COTISATIONS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-COT.

       DATA DIVISION.
       FILE SECTION.
       FD  EMPLOYEE-FILE.
       COPY "EMPLOYEE-RECORD.cpy".

       FD  VARIABLES-FILE.
       01  VARIABLES-RECORD.
           05  VAR-MATRICULE          PIC X(8).
           05  VAR-PERIODE            PIC 9(6).
           05  VAR-HEURES-SUP         PIC S9(5)V99 COMP-3.
           05  VAR-PRIME-EXCEPT       PIC S9(9)V99 COMP-3.
           05  VAR-ABSENCE-HEURES     PIC S9(5)V99 COMP-3.
           05  VAR-ABSENCE-TYPE       PIC X(10).
           05  FILLER                 PIC X(50).

       FD  BULLETINS-FILE.
       COPY "PAIE-RECORD.cpy".

       FD  COTISATIONS-FILE.
       COPY "COTISATION-RECORD.cpy".

       WORKING-STORAGE SECTION.
      *    --- File paths ---
       01  WS-EMPLOYEE-PATH          PIC X(256).
       01  WS-VARIABLES-PATH         PIC X(256).
       01  WS-BULLETINS-PATH         PIC X(256).
       01  WS-COTISATIONS-PATH       PIC X(256).

      *    --- File status ---
       01  WS-FS-EMP                 PIC XX.
       01  WS-FS-VAR                 PIC XX.
       01  WS-FS-BUL                 PIC XX.
       01  WS-FS-COT                 PIC XX.

      *    --- Flags ---
       01  WS-EOF-VAR                PIC 9 VALUE 0.
           88  EOF-VAR               VALUE 1.
       01  WS-EMP-FOUND              PIC 9 VALUE 0.
           88  EMP-FOUND             VALUE 1.

      *    --- Compteurs ---
       01  WS-RECORDS-READ           PIC 9(6) VALUE 0.
       01  WS-RECORDS-WRITTEN        PIC 9(6) VALUE 0.
       01  WS-ERRORS                 PIC 9(6) VALUE 0.

      *    --- Période de traitement ---
       01  WS-PERIODE                PIC 9(6).
       01  WS-DATE-PAIEMENT          PIC 9(8).

      ******************************************************************
      * CONSTANTES RÉGLEMENTAIRES — Taux 2024
      * Chaque taux est commenté avec sa source juridique
      ******************************************************************

      *    --- PMSS et SMIC (Arrêté du 19 décembre 2023) ---
       01  WS-PMSS                   PIC S9(9)V99 COMP-3
                                     VALUE 3864.00.
       01  WS-SMIC-MENSUEL           PIC S9(9)V99 COMP-3
                                     VALUE 1766.92.

      *    --- Cotisations salariales ---
      *    Sécurité Sociale maladie salarié : 0% depuis 2018
      *    Art. L241-2 CSS, Loi n°2017-1836
       01  WS-TX-MALADIE-SAL         PIC S9(3)V99 COMP-3
                                     VALUE 0.00.

      *    Vieillesse plafonnée salarié : 6.90% sur T1
      *    Décret n°2012-1116 du 2 octobre 2012
       01  WS-TX-VIEILL-PLAF-SAL     PIC S9(3)V99 COMP-3
                                     VALUE 6.90.

      *    Vieillesse déplafonnée salarié : 0.40% sur brut total
      *    Décret n°2013-1290 du 27 décembre 2013
       01  WS-TX-VIEILL-DEPLAF-SAL   PIC S9(3)V99 COMP-3
                                     VALUE 0.40.

      *    CSG déductible : 6.80% sur 98.25% du brut
      *    Art. L136-2 CSS, Loi de financement SS 2018
       01  WS-TX-CSG-DEDUCT          PIC S9(3)V99 COMP-3
                                     VALUE 6.80.

      *    CSG non déductible + CRDS : 2.90% sur 98.25% du brut
      *    Art. L136-8 CSS + Ordonnance n°96-50 du 24/01/1996
       01  WS-TX-CSG-NON-DEDUCT      PIC S9(3)V99 COMP-3
                                     VALUE 2.90.

      *    Assiette CSG/CRDS : 98.25% du brut
      *    Art. L136-2 CSS
       01  WS-TX-ASSIETTE-CSG        PIC S9(3)V99 COMP-3
                                     VALUE 98.25.

      *    Mutuelle salarié : 0.50% (part salariale convention)
       01  WS-TX-MUTUELLE-SAL        PIC S9(3)V99 COMP-3
                                     VALUE 0.50.

      *    Retraite complémentaire AGIRC-ARRCO salarié
      *    ANI du 17 novembre 2017
      *    T1 (≤ PMSS) : 3.15%
       01  WS-TX-RETR-T1-SAL         PIC S9(3)V99 COMP-3
                                     VALUE 3.15.
      *    T2 (> PMSS, ≤ 8 PMSS) : 8.64%
       01  WS-TX-RETR-T2-SAL         PIC S9(3)V99 COMP-3
                                     VALUE 8.64.

      *    Prévoyance salarié : 0.50% sur T1 (convention)
       01  WS-TX-PREVOY-SAL          PIC S9(3)V99 COMP-3
                                     VALUE 0.50.

      *    Chômage salarié : 0.00% (supprimé depuis oct. 2018)
      *    Loi n°2018-771 du 5 septembre 2018
       01  WS-TX-CHOMAGE-SAL         PIC S9(3)V99 COMP-3
                                     VALUE 0.00.

      *    CEG salarié — ANI du 17 novembre 2017
      *    T1 : 0.86%
       01  WS-TX-CEG-T1-SAL          PIC S9(3)V99 COMP-3
                                     VALUE 0.86.
      *    T2 : 1.08%
       01  WS-TX-CEG-T2-SAL          PIC S9(3)V99 COMP-3
                                     VALUE 1.08.

      *    --- Cotisations patronales ---
      *    Maladie-maternité patronal non-cadre : 7.00%
      *    Art. L241-2 CSS
       01  WS-TX-MALADIE-PAT-NC      PIC S9(3)V99 COMP-3
                                     VALUE 7.00.
      *    Maladie-maternité patronal cadre : 13.00%
       01  WS-TX-MALADIE-PAT-C       PIC S9(3)V99 COMP-3
                                     VALUE 13.00.

      *    Vieillesse plafonnée patronal : 8.55% sur T1
      *    Décret n°2014-1531 du 17 décembre 2014
       01  WS-TX-VIEILL-PLAF-PAT     PIC S9(3)V99 COMP-3
                                     VALUE 8.55.

      *    Vieillesse déplafonnée patronal : 1.90% sur brut
      *    Décret n°2013-1290 du 27 décembre 2013
       01  WS-TX-VIEILL-DEPLAF-PAT   PIC S9(3)V99 COMP-3
                                     VALUE 1.90.

      *    Allocations familiales réduit : 3.45% (brut ≤ 3.5 SMIC)
      *    Art. L241-6-1 CSS
       01  WS-TX-ALLOC-FAM-REDUIT    PIC S9(3)V99 COMP-3
                                     VALUE 3.45.
      *    Allocations familiales normal : 5.25%
       01  WS-TX-ALLOC-FAM-NORMAL    PIC S9(3)V99 COMP-3
                                     VALUE 5.25.

      *    AT/MP : 2.22% (taux fixe seed)
      *    Art. L241-5 CSS
       01  WS-TX-ATMP                PIC S9(3)V99 COMP-3
                                     VALUE 2.22.

      *    FNAL : 0.50% (entreprise ≥ 50 salariés)
      *    Art. L834-1 CSS
       01  WS-TX-FNAL                PIC S9(3)V99 COMP-3
                                     VALUE 0.50.

      *    Retraite complémentaire AGIRC-ARRCO patronal
      *    ANI du 17 novembre 2017
       01  WS-TX-RETR-T1-PAT         PIC S9(3)V99 COMP-3
                                     VALUE 4.72.
       01  WS-TX-RETR-T2-PAT         PIC S9(3)V99 COMP-3
                                     VALUE 12.95.

      *    CEG patronal — ANI du 17 novembre 2017
       01  WS-TX-CEG-T1-PAT          PIC S9(3)V99 COMP-3
                                     VALUE 1.29.
       01  WS-TX-CEG-T2-PAT          PIC S9(3)V99 COMP-3
                                     VALUE 1.62.

      *    Prévoyance patronale cadres : 1.50% T1 minimum
      *    ANI du 14 mars 1947, art. 7
       01  WS-TX-PREVOY-PAT          PIC S9(3)V99 COMP-3
                                     VALUE 1.50.

      *    Chômage patronal : 4.05% sur T1+T2
      *    Convention Unédic du 14 avril 2017
       01  WS-TX-CHOMAGE-PAT         PIC S9(3)V99 COMP-3
                                     VALUE 4.05.

      *    AGS : 0.15% déplafonnée
      *    Art. L3253-18 Code du travail
       01  WS-TX-AGS                 PIC S9(3)V99 COMP-3
                                     VALUE 0.15.

      *    Seuil allocations familiales : 3.5 × SMIC
       01  WS-SEUIL-ALLOC-FAM        PIC S9(9)V99 COMP-3
                                     VALUE 6184.22.

      *    Plafond chômage : 4 × PMSS
       01  WS-PLAFOND-CHOMAGE         PIC S9(9)V99 COMP-3
                                     VALUE 15456.00.

      *    Majoration heures supplémentaires
      *    Art. L3121-36 Code du travail
       01  WS-TX-HS-25               PIC S9(3)V99 COMP-3
                                     VALUE 25.00.
       01  WS-TX-HS-50               PIC S9(3)V99 COMP-3
                                     VALUE 50.00.
       01  WS-SEUIL-HS-50            PIC S9(5)V99 COMP-3
                                     VALUE 8.00.

      *    Convention ancienneté : 1% par année, max 15%
       01  WS-TX-ANCIENNETE          PIC S9(3)V99 COMP-3
                                     VALUE 1.00.
       01  WS-MAX-ANCIENNETE         PIC S9(3)V99 COMP-3
                                     VALUE 15.00.

      *    --- Barème taux neutre PAS 2024 ---
      *    Art. 204 H du CGI, Arrêté du 27 décembre 2023
       01  WS-PAS-TRANCHE.
           05  WS-PAS-LIM-1          PIC S9(9)V99 COMP-3
                                     VALUE 1592.00.
           05  WS-PAS-LIM-2          PIC S9(9)V99 COMP-3
                                     VALUE 1944.00.
           05  WS-PAS-LIM-3          PIC S9(9)V99 COMP-3
                                     VALUE 2592.00.
           05  WS-PAS-LIM-4          PIC S9(9)V99 COMP-3
                                     VALUE 3584.00.
           05  WS-PAS-LIM-5          PIC S9(9)V99 COMP-3
                                     VALUE 4897.00.
           05  WS-PAS-LIM-6          PIC S9(9)V99 COMP-3
                                     VALUE 6893.00.
           05  WS-PAS-LIM-7          PIC S9(9)V99 COMP-3
                                     VALUE 9085.00.
           05  WS-PAS-LIM-8          PIC S9(9)V99 COMP-3
                                     VALUE 12112.00.

       01  WS-PAS-TAUX.
           05  WS-PAS-TX-0           PIC S9(3)V99 COMP-3
                                     VALUE 0.00.
           05  WS-PAS-TX-1           PIC S9(3)V99 COMP-3
                                     VALUE 2.50.
           05  WS-PAS-TX-2           PIC S9(3)V99 COMP-3
                                     VALUE 10.00.
           05  WS-PAS-TX-3           PIC S9(3)V99 COMP-3
                                     VALUE 15.00.
           05  WS-PAS-TX-4           PIC S9(3)V99 COMP-3
                                     VALUE 20.00.
           05  WS-PAS-TX-5           PIC S9(3)V99 COMP-3
                                     VALUE 25.00.
           05  WS-PAS-TX-6           PIC S9(3)V99 COMP-3
                                     VALUE 35.00.
           05  WS-PAS-TX-7           PIC S9(3)V99 COMP-3
                                     VALUE 38.00.
           05  WS-PAS-TX-8           PIC S9(3)V99 COMP-3
                                     VALUE 43.00.

      *    --- Variables de calcul ---
       01  WS-CALC.
           05  WS-BRUT               PIC S9(9)V99 COMP-3.
           05  WS-SALAIRE-BASE       PIC S9(9)V99 COMP-3.
           05  WS-MONTANT-HS-25      PIC S9(9)V99 COMP-3.
           05  WS-MONTANT-HS-50      PIC S9(9)V99 COMP-3.
           05  WS-PRIME-ANC          PIC S9(9)V99 COMP-3.
           05  WS-ABSENCE-MONTANT    PIC S9(9)V99 COMP-3.
           05  WS-TRANCHE-1          PIC S9(9)V99 COMP-3.
           05  WS-TRANCHE-2          PIC S9(9)V99 COMP-3.
           05  WS-ASSIETTE-CSG       PIC S9(9)V99 COMP-3.
           05  WS-BASE-CHOMAGE       PIC S9(9)V99 COMP-3.
           05  WS-TOTAL-COT-SAL      PIC S9(9)V99 COMP-3.
           05  WS-NET-IMPOSABLE      PIC S9(9)V99 COMP-3.
           05  WS-TAUX-PAS-CALC      PIC S9(3)V99 COMP-3.
           05  WS-MONTANT-PAS        PIC S9(9)V99 COMP-3.
           05  WS-NET-AVANT-PAS      PIC S9(9)V99 COMP-3.
           05  WS-NET-A-PAYER        PIC S9(9)V99 COMP-3.
           05  WS-EXONER-HS          PIC S9(9)V99 COMP-3.
           05  WS-HEURES-SUP-25      PIC S9(5)V99 COMP-3.
           05  WS-HEURES-SUP-50      PIC S9(5)V99 COMP-3.
           05  WS-TOTAL-HS           PIC S9(9)V99 COMP-3.

      *    --- Variables cotisations salariales individuelles ---
       01  WS-COT-SAL.
           05  WS-CS-MALADIE         PIC S9(9)V99 COMP-3.
           05  WS-CS-VIEILL-PLAF     PIC S9(9)V99 COMP-3.
           05  WS-CS-VIEILL-DEPLAF   PIC S9(9)V99 COMP-3.
           05  WS-CS-CSG-DEDUCT      PIC S9(9)V99 COMP-3.
           05  WS-CS-CSG-NON-DED     PIC S9(9)V99 COMP-3.
           05  WS-CS-MUTUELLE        PIC S9(9)V99 COMP-3.
           05  WS-CS-RETR-T1         PIC S9(9)V99 COMP-3.
           05  WS-CS-RETR-T2         PIC S9(9)V99 COMP-3.
           05  WS-CS-PREVOY          PIC S9(9)V99 COMP-3.
           05  WS-CS-CHOMAGE         PIC S9(9)V99 COMP-3.
           05  WS-CS-CEG-T1          PIC S9(9)V99 COMP-3.
           05  WS-CS-CEG-T2          PIC S9(9)V99 COMP-3.

      *    --- Variables cotisations patronales individuelles ---
       01  WS-COT-PAT.
           05  WS-CP-MALADIE         PIC S9(9)V99 COMP-3.
           05  WS-CP-VIEILL-PLAF     PIC S9(9)V99 COMP-3.
           05  WS-CP-VIEILL-DEPLAF   PIC S9(9)V99 COMP-3.
           05  WS-CP-ALLOC-FAM       PIC S9(9)V99 COMP-3.
           05  WS-CP-ATMP            PIC S9(9)V99 COMP-3.
           05  WS-CP-FNAL            PIC S9(9)V99 COMP-3.
           05  WS-CP-RETR-T1         PIC S9(9)V99 COMP-3.
           05  WS-CP-RETR-T2         PIC S9(9)V99 COMP-3.
           05  WS-CP-CEG-T1          PIC S9(9)V99 COMP-3.
           05  WS-CP-CEG-T2          PIC S9(9)V99 COMP-3.
           05  WS-CP-PREVOY          PIC S9(9)V99 COMP-3.
           05  WS-CP-CHOMAGE         PIC S9(9)V99 COMP-3.
           05  WS-CP-AGS             PIC S9(9)V99 COMP-3.
           05  WS-CP-TOTAL           PIC S9(9)V99 COMP-3.

      *    --- Temporaire ---
       01  WS-TEMP                   PIC S9(9)V99 COMP-3.
       01  WS-TEMP2                  PIC S9(9)V99 COMP-3.

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALISATION
           PERFORM 2000-TRAITEMENT
           PERFORM 9000-FIN
           STOP RUN.

      ******************************************************************
       1000-INITIALISATION.
      ******************************************************************
           ACCEPT WS-EMPLOYEE-PATH FROM ENVIRONMENT "EMPLOYEE_FILE"
           ACCEPT WS-VARIABLES-PATH FROM ENVIRONMENT "VARIABLES_FILE"
           ACCEPT WS-BULLETINS-PATH FROM ENVIRONMENT "BULLETINS_FILE"
           ACCEPT WS-COTISATIONS-PATH
               FROM ENVIRONMENT "COTISATIONS_FILE"

           IF WS-EMPLOYEE-PATH = SPACES
               MOVE "../data/EMPLOYEES.dat" TO WS-EMPLOYEE-PATH
           END-IF
           IF WS-VARIABLES-PATH = SPACES
               MOVE "../data/VARIABLES-PAIE.dat" TO WS-VARIABLES-PATH
           END-IF
           IF WS-BULLETINS-PATH = SPACES
               MOVE "../data/BULLETINS.dat" TO WS-BULLETINS-PATH
           END-IF
           IF WS-COTISATIONS-PATH = SPACES
               MOVE "../data/COTISATIONS-PATRONALES.dat"
                   TO WS-COTISATIONS-PATH
           END-IF

           OPEN INPUT EMPLOYEE-FILE
           IF WS-FS-EMP NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|0|OPEN-EMP=" WS-FS-EMP
               STOP RUN
           END-IF

           OPEN INPUT VARIABLES-FILE
           IF WS-FS-VAR NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|0|OPEN-VAR=" WS-FS-VAR
               CLOSE EMPLOYEE-FILE
               STOP RUN
           END-IF

           OPEN OUTPUT BULLETINS-FILE
           IF WS-FS-BUL NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|0|OPEN-BUL=" WS-FS-BUL
               CLOSE EMPLOYEE-FILE
               CLOSE VARIABLES-FILE
               STOP RUN
           END-IF

           OPEN OUTPUT COTISATIONS-FILE
           IF WS-FS-COT NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|0|OPEN-COT=" WS-FS-COT
               CLOSE EMPLOYEE-FILE
               CLOSE VARIABLES-FILE
               CLOSE BULLETINS-FILE
               STOP RUN
           END-IF

           DISPLAY "CALC-PAIE|START|0|0".

      ******************************************************************
       2000-TRAITEMENT.
      ******************************************************************
           READ VARIABLES-FILE
               AT END SET EOF-VAR TO TRUE
               NOT AT END CONTINUE
           END-READ

           IF WS-FS-VAR NOT = "00" AND WS-FS-VAR NOT = "10"
               DISPLAY "CALC-PAIE|ERROR|0|READ-VAR=" WS-FS-VAR
               ADD 1 TO WS-ERRORS
           END-IF

           PERFORM UNTIL EOF-VAR
               ADD 1 TO WS-RECORDS-READ
               MOVE VAR-PERIODE TO WS-PERIODE

      *        Compute date de paiement (last day of month approx)
               STRING WS-PERIODE "28" DELIMITED SIZE
                   INTO WS-DATE-PAIEMENT
               END-STRING

      *        Lookup employee by matricule
               MOVE VAR-MATRICULE TO EMP-MATRICULE
               READ EMPLOYEE-FILE
                   KEY IS EMP-MATRICULE
                   INVALID KEY
                       DISPLAY "CALC-PAIE|WARN|"
                           WS-RECORDS-READ "|EMP-NOT-FOUND="
                           VAR-MATRICULE
                       ADD 1 TO WS-ERRORS
                   NOT INVALID KEY
                       PERFORM 3000-CALCUL-PAIE-EMPLOYE
               END-READ

               IF WS-FS-EMP NOT = "00" AND WS-FS-EMP NOT = "23"
                   DISPLAY "CALC-PAIE|ERROR|" WS-RECORDS-READ
                       "|READ-EMP=" WS-FS-EMP
                   ADD 1 TO WS-ERRORS
               END-IF

               READ VARIABLES-FILE
                   AT END SET EOF-VAR TO TRUE
                   NOT AT END CONTINUE
               END-READ
           END-PERFORM.

      ******************************************************************
       3000-CALCUL-PAIE-EMPLOYE.
      ******************************************************************
           INITIALIZE WS-CALC
           INITIALIZE WS-COT-SAL
           INITIALIZE WS-COT-PAT

      *    --- Salaire de base ---
           IF EMP-CADRE OR EMP-CADRE-DIR
               MOVE EMP-FORFAIT-MENSUEL TO WS-SALAIRE-BASE
           ELSE
               COMPUTE WS-SALAIRE-BASE ROUNDED =
                   EMP-TAUX-HORAIRE * EMP-HEURES-MENSUELLES
           END-IF

      *    --- Heures supplémentaires (non-cadres uniquement) ---
           MOVE 0 TO WS-MONTANT-HS-25
           MOVE 0 TO WS-MONTANT-HS-50
           MOVE 0 TO WS-HEURES-SUP-25
           MOVE 0 TO WS-HEURES-SUP-50

           IF EMP-NON-CADRE AND VAR-HEURES-SUP > 0
               IF VAR-HEURES-SUP > WS-SEUIL-HS-50
                   MOVE WS-SEUIL-HS-50 TO WS-HEURES-SUP-25
                   COMPUTE WS-HEURES-SUP-50 =
                       VAR-HEURES-SUP - WS-SEUIL-HS-50
               ELSE
                   MOVE VAR-HEURES-SUP TO WS-HEURES-SUP-25
                   MOVE 0 TO WS-HEURES-SUP-50
               END-IF

      *        Majoration 25% — Art. L3121-36 Code du travail
               COMPUTE WS-MONTANT-HS-25 ROUNDED =
                   WS-HEURES-SUP-25 * EMP-TAUX-HORAIRE * 1.25
      *        Majoration 50%
               COMPUTE WS-MONTANT-HS-50 ROUNDED =
                   WS-HEURES-SUP-50 * EMP-TAUX-HORAIRE * 1.50
           END-IF

           COMPUTE WS-TOTAL-HS = WS-MONTANT-HS-25 + WS-MONTANT-HS-50

      *    --- Prime d'ancienneté (convention métallurgie) ---
           IF EMP-ANCIENNETE-ANNEES > 0
               COMPUTE WS-TEMP =
                   EMP-ANCIENNETE-ANNEES * WS-TX-ANCIENNETE
               IF WS-TEMP > WS-MAX-ANCIENNETE
                   MOVE WS-MAX-ANCIENNETE TO WS-TEMP
               END-IF
               COMPUTE WS-PRIME-ANC ROUNDED =
                   WS-SALAIRE-BASE * WS-TEMP / 100
           ELSE
               MOVE 0 TO WS-PRIME-ANC
           END-IF

      *    --- Absence (déduction) ---
           IF VAR-ABSENCE-HEURES > 0
               COMPUTE WS-ABSENCE-MONTANT ROUNDED =
                   VAR-ABSENCE-HEURES * EMP-TAUX-HORAIRE
               IF EMP-CADRE OR EMP-CADRE-DIR
                   COMPUTE WS-ABSENCE-MONTANT ROUNDED =
                       EMP-FORFAIT-MENSUEL / 151.67
                       * VAR-ABSENCE-HEURES
               END-IF
           ELSE
               MOVE 0 TO WS-ABSENCE-MONTANT
           END-IF

      *    --- Brut total ---
           COMPUTE WS-BRUT =
               WS-SALAIRE-BASE
               + WS-TOTAL-HS
               + WS-PRIME-ANC
               + VAR-PRIME-EXCEPT
               - WS-ABSENCE-MONTANT

      *    --- Tranches ---
           IF WS-BRUT > WS-PMSS
               MOVE WS-PMSS TO WS-TRANCHE-1
               COMPUTE WS-TRANCHE-2 = WS-BRUT - WS-PMSS
           ELSE
               MOVE WS-BRUT TO WS-TRANCHE-1
               MOVE 0 TO WS-TRANCHE-2
           END-IF

      *    --- Base chômage (plafond 4 × PMSS) ---
           IF WS-BRUT > WS-PLAFOND-CHOMAGE
               MOVE WS-PLAFOND-CHOMAGE TO WS-BASE-CHOMAGE
           ELSE
               MOVE WS-BRUT TO WS-BASE-CHOMAGE
           END-IF

      *    ============================================================
      *    COTISATIONS SALARIALES
      *    ============================================================

      *    Maladie salarié : 0% depuis 2018
           MOVE 0 TO WS-CS-MALADIE

      *    Vieillesse plafonnée salarié : 6.90% T1
           COMPUTE WS-CS-VIEILL-PLAF ROUNDED =
               WS-TRANCHE-1 * WS-TX-VIEILL-PLAF-SAL / 100

      *    Vieillesse déplafonnée salarié : 0.40% brut
           COMPUTE WS-CS-VIEILL-DEPLAF ROUNDED =
               WS-BRUT * WS-TX-VIEILL-DEPLAF-SAL / 100

      *    Assiette CSG/CRDS : 98.25% du brut
           COMPUTE WS-ASSIETTE-CSG ROUNDED =
               WS-BRUT * WS-TX-ASSIETTE-CSG / 100

      *    CSG déductible : 6.80%
           COMPUTE WS-CS-CSG-DEDUCT ROUNDED =
               WS-ASSIETTE-CSG * WS-TX-CSG-DEDUCT / 100

      *    CSG non déductible + CRDS : 2.90%
           COMPUTE WS-CS-CSG-NON-DED ROUNDED =
               WS-ASSIETTE-CSG * WS-TX-CSG-NON-DEDUCT / 100

      *    Mutuelle salarié
           COMPUTE WS-CS-MUTUELLE ROUNDED =
               WS-BRUT * WS-TX-MUTUELLE-SAL / 100

      *    Retraite complémentaire AGIRC-ARRCO salarié
           COMPUTE WS-CS-RETR-T1 ROUNDED =
               WS-TRANCHE-1 * WS-TX-RETR-T1-SAL / 100
           COMPUTE WS-CS-RETR-T2 ROUNDED =
               WS-TRANCHE-2 * WS-TX-RETR-T2-SAL / 100

      *    Prévoyance salarié
           COMPUTE WS-CS-PREVOY ROUNDED =
               WS-TRANCHE-1 * WS-TX-PREVOY-SAL / 100

      *    Chômage salarié : 0%
           MOVE 0 TO WS-CS-CHOMAGE

      *    CEG salarié
           COMPUTE WS-CS-CEG-T1 ROUNDED =
               WS-TRANCHE-1 * WS-TX-CEG-T1-SAL / 100
           COMPUTE WS-CS-CEG-T2 ROUNDED =
               WS-TRANCHE-2 * WS-TX-CEG-T2-SAL / 100

      *    --- Exonération cotisations salariales sur HS (loi TEPA) ---
      *    Loi n°2018-1213 du 24 décembre 2018, art. 2
           IF WS-TOTAL-HS > 0
               COMPUTE WS-EXONER-HS ROUNDED =
                   WS-TOTAL-HS * (WS-TX-VIEILL-PLAF-SAL
                   + WS-TX-VIEILL-DEPLAF-SAL
                   + WS-TX-RETR-T1-SAL
                   + WS-TX-CEG-T1-SAL) / 100
           ELSE
               MOVE 0 TO WS-EXONER-HS
           END-IF

      *    --- Total cotisations salariales ---
           COMPUTE WS-TOTAL-COT-SAL =
               WS-CS-MALADIE
               + WS-CS-VIEILL-PLAF
               + WS-CS-VIEILL-DEPLAF
               + WS-CS-CSG-DEDUCT
               + WS-CS-CSG-NON-DED
               + WS-CS-MUTUELLE
               + WS-CS-RETR-T1
               + WS-CS-RETR-T2
               + WS-CS-PREVOY
               + WS-CS-CHOMAGE
               + WS-CS-CEG-T1
               + WS-CS-CEG-T2
               - WS-EXONER-HS

      *    ============================================================
      *    NET IMPOSABLE, PAS, NET À PAYER
      *    ============================================================

      *    Net imposable = brut - cot salariales + CSG non déd + CRDS
           COMPUTE WS-NET-IMPOSABLE =
               WS-BRUT - WS-TOTAL-COT-SAL
               + WS-CS-CSG-NON-DED

      *    Determine taux PAS from employee record or barème neutre
           IF EMP-TAUX-PAS > 0
               MOVE EMP-TAUX-PAS TO WS-TAUX-PAS-CALC
           ELSE
               PERFORM 3500-CALCUL-TAUX-PAS-NEUTRE
           END-IF

      *    Montant PAS
           COMPUTE WS-MONTANT-PAS ROUNDED =
               WS-NET-IMPOSABLE * WS-TAUX-PAS-CALC / 100

      *    Net avant PAS
           COMPUTE WS-NET-AVANT-PAS =
               WS-BRUT - WS-TOTAL-COT-SAL

      *    Net à payer
           COMPUTE WS-NET-A-PAYER =
               WS-NET-AVANT-PAS - WS-MONTANT-PAS

      *    ============================================================
      *    COTISATIONS PATRONALES
      *    ============================================================
           PERFORM 4000-CALCUL-COTISATIONS-PAT

      *    ============================================================
      *    ÉCRITURE DES ENREGISTREMENTS
      *    ============================================================
           PERFORM 5000-ECRIRE-BULLETIN
           PERFORM 6000-ECRIRE-COTISATIONS

           ADD 1 TO WS-RECORDS-WRITTEN.

      ******************************************************************
       3500-CALCUL-TAUX-PAS-NEUTRE.
      ******************************************************************
      *    Barème taux neutre PAS 2024
      *    Art. 204 H du CGI
           EVALUATE TRUE
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-1
                   MOVE WS-PAS-TX-0 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-2
                   MOVE WS-PAS-TX-1 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-3
                   MOVE WS-PAS-TX-2 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-4
                   MOVE WS-PAS-TX-3 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-5
                   MOVE WS-PAS-TX-4 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-6
                   MOVE WS-PAS-TX-5 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-7
                   MOVE WS-PAS-TX-6 TO WS-TAUX-PAS-CALC
               WHEN WS-NET-IMPOSABLE <= WS-PAS-LIM-8
                   MOVE WS-PAS-TX-7 TO WS-TAUX-PAS-CALC
               WHEN OTHER
                   MOVE WS-PAS-TX-8 TO WS-TAUX-PAS-CALC
           END-EVALUATE.

      ******************************************************************
       4000-CALCUL-COTISATIONS-PAT.
      ******************************************************************
      *    Maladie patronale — Art. L241-2 CSS
           IF EMP-NON-CADRE
               COMPUTE WS-CP-MALADIE ROUNDED =
                   WS-BRUT * WS-TX-MALADIE-PAT-NC / 100
           ELSE
               COMPUTE WS-CP-MALADIE ROUNDED =
                   WS-BRUT * WS-TX-MALADIE-PAT-C / 100
           END-IF

      *    Vieillesse plafonnée patronale — Décret n°2014-1531
           COMPUTE WS-CP-VIEILL-PLAF ROUNDED =
               WS-TRANCHE-1 * WS-TX-VIEILL-PLAF-PAT / 100

      *    Vieillesse déplafonnée patronale
           COMPUTE WS-CP-VIEILL-DEPLAF ROUNDED =
               WS-BRUT * WS-TX-VIEILL-DEPLAF-PAT / 100

      *    Allocations familiales — Art. L241-6-1 CSS
           IF WS-BRUT <= WS-SEUIL-ALLOC-FAM
               COMPUTE WS-CP-ALLOC-FAM ROUNDED =
                   WS-BRUT * WS-TX-ALLOC-FAM-REDUIT / 100
           ELSE
               COMPUTE WS-CP-ALLOC-FAM ROUNDED =
                   WS-BRUT * WS-TX-ALLOC-FAM-NORMAL / 100
           END-IF

      *    AT/MP — Art. L241-5 CSS
           COMPUTE WS-CP-ATMP ROUNDED =
               WS-BRUT * WS-TX-ATMP / 100

      *    FNAL — Art. L834-1 CSS (≥ 50 salariés)
           COMPUTE WS-CP-FNAL ROUNDED =
               WS-BRUT * WS-TX-FNAL / 100

      *    Retraite complémentaire patronale — ANI 2017
           COMPUTE WS-CP-RETR-T1 ROUNDED =
               WS-TRANCHE-1 * WS-TX-RETR-T1-PAT / 100
           COMPUTE WS-CP-RETR-T2 ROUNDED =
               WS-TRANCHE-2 * WS-TX-RETR-T2-PAT / 100

      *    CEG patronal — ANI 2017
           COMPUTE WS-CP-CEG-T1 ROUNDED =
               WS-TRANCHE-1 * WS-TX-CEG-T1-PAT / 100
           COMPUTE WS-CP-CEG-T2 ROUNDED =
               WS-TRANCHE-2 * WS-TX-CEG-T2-PAT / 100

      *    Prévoyance patronale (cadres seulement) — ANI 1947
           IF EMP-CADRE OR EMP-CADRE-DIR
               COMPUTE WS-CP-PREVOY ROUNDED =
                   WS-TRANCHE-1 * WS-TX-PREVOY-PAT / 100
           ELSE
               MOVE 0 TO WS-CP-PREVOY
           END-IF

      *    Chômage patronal — Convention Unédic
           COMPUTE WS-CP-CHOMAGE ROUNDED =
               WS-BASE-CHOMAGE * WS-TX-CHOMAGE-PAT / 100

      *    AGS — Art. L3253-18 Code du travail
           COMPUTE WS-CP-AGS ROUNDED =
               WS-BRUT * WS-TX-AGS / 100

      *    Total cotisations patronales
           COMPUTE WS-CP-TOTAL =
               WS-CP-MALADIE
               + WS-CP-VIEILL-PLAF
               + WS-CP-VIEILL-DEPLAF
               + WS-CP-ALLOC-FAM
               + WS-CP-ATMP
               + WS-CP-FNAL
               + WS-CP-RETR-T1
               + WS-CP-RETR-T2
               + WS-CP-CEG-T1
               + WS-CP-CEG-T2
               + WS-CP-PREVOY
               + WS-CP-CHOMAGE
               + WS-CP-AGS.

      ******************************************************************
       5000-ECRIRE-BULLETIN.
      ******************************************************************
           INITIALIZE PAIE-RECORD

           MOVE EMP-MATRICULE        TO PAI-MATRICULE
           MOVE WS-PERIODE           TO PAI-PERIODE
           MOVE EMP-NOM              TO PAI-NOM
           MOVE EMP-PRENOM           TO PAI-PRENOM
           MOVE EMP-DEPARTEMENT      TO PAI-DEPARTEMENT
           MOVE EMP-CLASSIFICATION   TO PAI-CLASSIFICATION
           MOVE WS-DATE-PAIEMENT     TO PAI-DATE-PAIEMENT

           IF EMP-NON-CADRE
               MOVE EMP-HEURES-MENSUELLES TO PAI-HEURES-BASE
               MOVE EMP-TAUX-HORAIRE  TO PAI-TAUX-HORAIRE
               MOVE 0                 TO PAI-FORFAIT-MENSUEL
           ELSE
               MOVE 0                 TO PAI-HEURES-BASE
               MOVE 0                 TO PAI-TAUX-HORAIRE
               MOVE EMP-FORFAIT-MENSUEL TO PAI-FORFAIT-MENSUEL
           END-IF

           MOVE WS-SALAIRE-BASE      TO PAI-SALAIRE-BASE
           MOVE WS-HEURES-SUP-25     TO PAI-HEURES-SUP-25
           MOVE WS-MONTANT-HS-25     TO PAI-MONTANT-HS-25
           MOVE WS-HEURES-SUP-50     TO PAI-HEURES-SUP-50
           MOVE WS-MONTANT-HS-50     TO PAI-MONTANT-HS-50
           MOVE WS-PRIME-ANC         TO PAI-PRIME-ANCIENNETE
           MOVE VAR-PRIME-EXCEPT     TO PAI-PRIME-EXCEPT
           MOVE VAR-ABSENCE-HEURES   TO PAI-ABSENCE-HEURES
           MOVE WS-ABSENCE-MONTANT   TO PAI-ABSENCE-MONTANT
           MOVE WS-BRUT              TO PAI-BRUT

           MOVE WS-CS-MALADIE        TO PAI-COT-MALADIE-SAL
           MOVE WS-CS-VIEILL-PLAF    TO PAI-COT-VIEILL-PLAF
           MOVE WS-CS-VIEILL-DEPLAF  TO PAI-COT-VIEILL-DEPLAF
           MOVE WS-CS-CSG-DEDUCT     TO PAI-CSG-DEDUCTIBLE
           MOVE WS-CS-CSG-NON-DED    TO PAI-CSG-NON-DEDUCT
           MOVE WS-CS-MUTUELLE       TO PAI-COT-MUTUELLE-SAL
           MOVE WS-CS-RETR-T1        TO PAI-COT-RETR-T1-SAL
           MOVE WS-CS-RETR-T2        TO PAI-COT-RETR-T2-SAL
           MOVE WS-CS-PREVOY         TO PAI-COT-PREVOY-SAL
           MOVE WS-CS-CHOMAGE        TO PAI-COT-CHOMAGE-SAL
           MOVE WS-CS-CEG-T1         TO PAI-COT-CEG-T1-SAL
           MOVE WS-CS-CEG-T2         TO PAI-COT-CEG-T2-SAL
           MOVE WS-TOTAL-COT-SAL     TO PAI-TOTAL-COT-SAL
           MOVE WS-EXONER-HS         TO PAI-EXONER-HS
           MOVE WS-NET-IMPOSABLE     TO PAI-NET-IMPOSABLE
           MOVE WS-TAUX-PAS-CALC     TO PAI-TAUX-PAS
           MOVE WS-MONTANT-PAS       TO PAI-MONTANT-PAS
           MOVE WS-NET-AVANT-PAS     TO PAI-NET-AVANT-PAS
           MOVE WS-NET-A-PAYER       TO PAI-NET-A-PAYER
           MOVE WS-TRANCHE-1         TO PAI-TRANCHE-1
           MOVE WS-TRANCHE-2         TO PAI-TRANCHE-2

           WRITE PAIE-RECORD
           IF WS-FS-BUL NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|" WS-RECORDS-READ
                   "|WRITE-BUL=" WS-FS-BUL
               ADD 1 TO WS-ERRORS
           END-IF.

      ******************************************************************
       6000-ECRIRE-COTISATIONS.
      ******************************************************************
           INITIALIZE COTISATION-RECORD

           MOVE EMP-MATRICULE        TO COT-MATRICULE
           MOVE WS-PERIODE           TO COT-PERIODE
           MOVE EMP-NOM              TO COT-NOM
           MOVE EMP-PRENOM           TO COT-PRENOM
           MOVE EMP-DEPARTEMENT      TO COT-DEPARTEMENT
           MOVE EMP-CLASSIFICATION   TO COT-CLASSIFICATION
           MOVE WS-BRUT              TO COT-BRUT

           MOVE WS-CP-MALADIE        TO COT-MALADIE-PAT
           MOVE WS-CP-VIEILL-PLAF    TO COT-VIEILL-PLAF-PAT
           MOVE WS-CP-VIEILL-DEPLAF  TO COT-VIEILL-DEPLAF-PAT
           MOVE WS-CP-ALLOC-FAM      TO COT-ALLOC-FAM-PAT
           MOVE WS-CP-ATMP           TO COT-ATMP-PAT
           MOVE WS-CP-FNAL           TO COT-FNAL-PAT
           MOVE WS-CP-RETR-T1        TO COT-RETR-T1-PAT
           MOVE WS-CP-RETR-T2        TO COT-RETR-T2-PAT
           MOVE WS-CP-CEG-T1         TO COT-CEG-T1-PAT
           MOVE WS-CP-CEG-T2         TO COT-CEG-T2-PAT
           MOVE WS-CP-PREVOY         TO COT-PREVOY-PAT
           MOVE WS-CP-CHOMAGE        TO COT-CHOMAGE-PAT
           MOVE WS-CP-AGS            TO COT-AGS-PAT
           MOVE WS-CP-TOTAL          TO COT-TOTAL-PAT

           WRITE COTISATION-RECORD
           IF WS-FS-COT NOT = "00"
               DISPLAY "CALC-PAIE|ERROR|" WS-RECORDS-READ
                   "|WRITE-COT=" WS-FS-COT
               ADD 1 TO WS-ERRORS
           END-IF.

      ******************************************************************
       9000-FIN.
      ******************************************************************
           CLOSE EMPLOYEE-FILE
           CLOSE VARIABLES-FILE
           CLOSE BULLETINS-FILE
           CLOSE COTISATIONS-FILE

           DISPLAY "CALC-PAIE|DONE|" WS-RECORDS-WRITTEN
               "|" WS-ERRORS.
