       IDENTIFICATION DIVISION.
       PROGRAM-ID. GENERATE-BULLETIN-TXT.
      ******************************************************************
      * GENERATE-BULLETIN-TXT — Génération bulletins de paie lisibles
      * Lit BULLETINS.dat, produit un fichier texte par employé
      * Format conforme à l'arrêté du 25 février 2016
      ******************************************************************
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT BULLETINS-FILE
               ASSIGN TO WS-BULLETINS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-BUL.

           SELECT OUTPUT-FILE
               ASSIGN TO WS-OUTPUT-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-OUT.

       DATA DIVISION.
       FILE SECTION.
       FD  BULLETINS-FILE.
       COPY "PAIE-RECORD.cpy".

       FD  OUTPUT-FILE
           RECORDING MODE IS F.
       01  OUTPUT-LINE               PIC X(132).

       WORKING-STORAGE SECTION.
       01  WS-BULLETINS-PATH         PIC X(256).
       01  WS-OUTPUT-PATH            PIC X(256).
       01  WS-FS-BUL                 PIC XX.
       01  WS-FS-OUT                 PIC XX.
       01  WS-EOF                    PIC 9 VALUE 0.
           88  EOF-BUL               VALUE 1.
       01  WS-RECORDS                PIC 9(6) VALUE 0.

      *    --- Ligne formatée ---
       01  WS-LINE                   PIC X(132).
       01  WS-SEPARATOR              PIC X(132) VALUE ALL "=".
       01  WS-DASH-SEP               PIC X(132) VALUE ALL "-".

      *    --- Formats d'affichage ---
       01  WS-FMT-MONTANT            PIC ZZZ,ZZ9.99-.
       01  WS-FMT-TAUX               PIC Z9.99.
       01  WS-FMT-HEURES             PIC ZZ9.99.
       01  WS-FMT-PERIODE.
           05  WS-FMT-PER-ANNEE      PIC 9(4).
           05  WS-FMT-PER-MOIS       PIC 9(2).
       01  WS-FMT-DATE.
           05  WS-FMT-DATE-J         PIC 9(2).
           05  FILLER                PIC X VALUE "/".
           05  WS-FMT-DATE-M         PIC 9(2).
           05  FILLER                PIC X VALUE "/".
           05  WS-FMT-DATE-A         PIC 9(4).

      *    --- Company info ---
       01  WS-COMPANY-NAME           PIC X(40)
               VALUE "METALLURGIQUE FRANCAISE SAS".
       01  WS-SIRET                  PIC X(17)
               VALUE "123 456 789 00012".
       01  WS-NAF                    PIC X(6) VALUE "2550A ".
       01  WS-URSSAF                 PIC X(20)
               VALUE "URSSAF IDF 75-12345 ".
       01  WS-CONVENTION             PIC X(40)
               VALUE "CCN Metallurgie (IDCC 3248)".

       PROCEDURE DIVISION.
       0000-MAIN.
           PERFORM 1000-INITIALISATION
           PERFORM 2000-TRAITEMENT
           PERFORM 9000-FIN
           STOP RUN.

      ******************************************************************
       1000-INITIALISATION.
      ******************************************************************
           ACCEPT WS-BULLETINS-PATH FROM ENVIRONMENT "BULLETINS_FILE"
           ACCEPT WS-OUTPUT-PATH FROM ENVIRONMENT "BULLETIN_TXT_FILE"

           IF WS-BULLETINS-PATH = SPACES
               MOVE "../data/BULLETINS.dat" TO WS-BULLETINS-PATH
           END-IF
           IF WS-OUTPUT-PATH = SPACES
               MOVE "../data/BULLETINS-TXT.dat" TO WS-OUTPUT-PATH
           END-IF

           OPEN INPUT BULLETINS-FILE
           IF WS-FS-BUL NOT = "00"
               DISPLAY "GENERATE-BULLETIN-TXT|ERROR|0|OPEN-BUL="
                   WS-FS-BUL
               STOP RUN
           END-IF

           OPEN OUTPUT OUTPUT-FILE
           IF WS-FS-OUT NOT = "00"
               DISPLAY "GENERATE-BULLETIN-TXT|ERROR|0|OPEN-OUT="
                   WS-FS-OUT
               CLOSE BULLETINS-FILE
               STOP RUN
           END-IF

           DISPLAY "GENERATE-BULLETIN-TXT|START|0|0".

      ******************************************************************
       2000-TRAITEMENT.
      ******************************************************************
           READ BULLETINS-FILE
               AT END SET EOF-BUL TO TRUE
           END-READ

           PERFORM UNTIL EOF-BUL
               PERFORM 3000-GENERER-BULLETIN
               ADD 1 TO WS-RECORDS
               READ BULLETINS-FILE
                   AT END SET EOF-BUL TO TRUE
               END-READ
           END-PERFORM.

      ******************************************************************
       3000-GENERER-BULLETIN.
      ******************************************************************
      *    === Section 1 : Identification employeur / employé ===
           MOVE WS-SEPARATOR TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           STRING "  BULLETIN DE PAIE" DELIMITED SIZE
               INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE WS-SEPARATOR TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    Employeur
           MOVE SPACES TO WS-LINE
           STRING "  Employeur : " WS-COMPANY-NAME
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  SIRET : " WS-SIRET
               "    NAF : " WS-NAF
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  " WS-URSSAF
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  Convention : " WS-CONVENTION
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    Employé
           MOVE SPACES TO WS-LINE
           STRING "  Matricule : " PAI-MATRICULE
               "    " PAI-NOM " " PAI-PRENOM
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  Departement : " PAI-DEPARTEMENT
               "    Classification : " PAI-CLASSIFICATION
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    === Section 2 : Période de paie ===
           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-PERIODE TO WS-FMT-PERIODE
           MOVE SPACES TO WS-LINE
           STRING "  Periode : " WS-FMT-PER-MOIS "/"
               WS-FMT-PER-ANNEE
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    === Section 3 : Salaire de base ===
           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  SALAIRE DE BASE" DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           IF PAI-FORFAIT-MENSUEL NOT = 0
               MOVE PAI-FORFAIT-MENSUEL TO WS-FMT-MONTANT
               MOVE SPACES TO WS-LINE
               STRING "    Forfait mensuel"
                   "                               "
                   WS-FMT-MONTANT
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE
           ELSE
               MOVE PAI-HEURES-BASE TO WS-FMT-HEURES
               MOVE SPACES TO WS-LINE
               STRING "    Heures : " WS-FMT-HEURES
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE

               MOVE PAI-SALAIRE-BASE TO WS-FMT-MONTANT
               MOVE SPACES TO WS-LINE
               STRING "    Salaire base"
                   "                                  "
                   WS-FMT-MONTANT
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE
           END-IF

      *    === Section 4 : Éléments variables ===
           IF PAI-MONTANT-HS-25 NOT = 0
               OR PAI-MONTANT-HS-50 NOT = 0
               OR PAI-PRIME-ANCIENNETE NOT = 0
               OR PAI-PRIME-EXCEPT NOT = 0
               OR PAI-ABSENCE-MONTANT NOT = 0

               MOVE SPACES TO WS-LINE
               STRING "  ELEMENTS VARIABLES"
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE

               IF PAI-MONTANT-HS-25 NOT = 0
                   MOVE PAI-HEURES-SUP-25 TO WS-FMT-HEURES
                   MOVE PAI-MONTANT-HS-25 TO WS-FMT-MONTANT
                   MOVE SPACES TO WS-LINE
                   STRING "    HS 25% (" WS-FMT-HEURES "h)"
                       "                           "
                       WS-FMT-MONTANT
                       DELIMITED SIZE INTO WS-LINE
                   MOVE WS-LINE TO OUTPUT-LINE
                   WRITE OUTPUT-LINE
               END-IF

               IF PAI-MONTANT-HS-50 NOT = 0
                   MOVE PAI-HEURES-SUP-50 TO WS-FMT-HEURES
                   MOVE PAI-MONTANT-HS-50 TO WS-FMT-MONTANT
                   MOVE SPACES TO WS-LINE
                   STRING "    HS 50% (" WS-FMT-HEURES "h)"
                       "                           "
                       WS-FMT-MONTANT
                       DELIMITED SIZE INTO WS-LINE
                   MOVE WS-LINE TO OUTPUT-LINE
                   WRITE OUTPUT-LINE
               END-IF

               IF PAI-PRIME-ANCIENNETE NOT = 0
                   MOVE PAI-PRIME-ANCIENNETE TO WS-FMT-MONTANT
                   MOVE SPACES TO WS-LINE
                   STRING "    Prime anciennete"
                       "                            "
                       WS-FMT-MONTANT
                       DELIMITED SIZE INTO WS-LINE
                   MOVE WS-LINE TO OUTPUT-LINE
                   WRITE OUTPUT-LINE
               END-IF

               IF PAI-PRIME-EXCEPT NOT = 0
                   MOVE PAI-PRIME-EXCEPT TO WS-FMT-MONTANT
                   MOVE SPACES TO WS-LINE
                   STRING "    Prime exceptionnelle"
                       "                        "
                       WS-FMT-MONTANT
                       DELIMITED SIZE INTO WS-LINE
                   MOVE WS-LINE TO OUTPUT-LINE
                   WRITE OUTPUT-LINE
               END-IF

               IF PAI-ABSENCE-MONTANT NOT = 0
                   MOVE PAI-ABSENCE-HEURES TO WS-FMT-HEURES
                   MOVE PAI-ABSENCE-MONTANT TO WS-FMT-MONTANT
                   MOVE SPACES TO WS-LINE
                   STRING "    Absence (" WS-FMT-HEURES "h)"
                       "                          -"
                       WS-FMT-MONTANT
                       DELIMITED SIZE INTO WS-LINE
                   MOVE WS-LINE TO OUTPUT-LINE
                   WRITE OUTPUT-LINE
               END-IF
           END-IF

      *    Brut total
           MOVE PAI-BRUT TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "                                  "
               "BRUT TOTAL    " WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    === Section 5 : Cotisations salariales ===
           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE SPACES TO WS-LINE
           STRING "  COTISATIONS SALARIALES"
               "            Base      Taux    Montant"
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           PERFORM 3100-AFFICHER-COT-SALARIALES

      *    === Section 6 : Net imposable ===
           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE
           MOVE PAI-NET-IMPOSABLE TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "  NET IMPOSABLE"
               "                                   "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    === Section 7 : PAS ===
           MOVE PAI-TAUX-PAS TO WS-FMT-TAUX
           MOVE PAI-MONTANT-PAS TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "  Prelevement a la source (taux "
               WS-FMT-TAUX "%)"
               "           -" WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    === Section 8 : Net à payer ===
           MOVE WS-DASH-SEP TO OUTPUT-LINE
           WRITE OUTPUT-LINE
           MOVE PAI-NET-AVANT-PAS TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "  NET A PAYER AVANT PAS"
               "                         "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-NET-A-PAYER TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "  NET A PAYER"
               "                                   "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE WS-SEPARATOR TO OUTPUT-LINE
           WRITE OUTPUT-LINE

      *    Blank line separator between bulletins
           MOVE SPACES TO OUTPUT-LINE
           WRITE OUTPUT-LINE.

      ******************************************************************
       3100-AFFICHER-COT-SALARIALES.
      ******************************************************************
           MOVE PAI-COT-MALADIE-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Maladie"
               "                                        "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-COT-VIEILL-PLAF TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Vieillesse plafonnee (6.90%)"
               "                "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-COT-VIEILL-DEPLAF TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Vieillesse deplafonnee (0.40%)"
               "              "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-CSG-DEDUCTIBLE TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    CSG deductible (6.80%)"
               "                      "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-CSG-NON-DEDUCT TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    CSG/CRDS non deductible (2.90%)"
               "             "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-COT-MUTUELLE-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Mutuelle (0.50%)"
               "                            "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-COT-RETR-T1-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Retraite T1 AGIRC-ARRCO (3.15%)"
               "            "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           IF PAI-COT-RETR-T2-SAL NOT = 0
               MOVE PAI-COT-RETR-T2-SAL TO WS-FMT-MONTANT
               MOVE SPACES TO WS-LINE
               STRING "    Retraite T2 AGIRC-ARRCO (8.64%)"
                   "            "
                   WS-FMT-MONTANT
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE
           END-IF

           MOVE PAI-COT-PREVOY-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    Prevoyance (0.50%)"
               "                          "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           MOVE PAI-COT-CEG-T1-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "    CEG T1 (0.86%)"
               "                              "
               WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE

           IF PAI-COT-CEG-T2-SAL NOT = 0
               MOVE PAI-COT-CEG-T2-SAL TO WS-FMT-MONTANT
               MOVE SPACES TO WS-LINE
               STRING "    CEG T2 (1.08%)"
                   "                              "
                   WS-FMT-MONTANT
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE
           END-IF

           IF PAI-EXONER-HS NOT = 0
               MOVE PAI-EXONER-HS TO WS-FMT-MONTANT
               MOVE SPACES TO WS-LINE
               STRING "    Exoneration HS (loi TEPA)"
                   "                 -"
                   WS-FMT-MONTANT
                   DELIMITED SIZE INTO WS-LINE
               MOVE WS-LINE TO OUTPUT-LINE
               WRITE OUTPUT-LINE
           END-IF

           MOVE PAI-TOTAL-COT-SAL TO WS-FMT-MONTANT
           MOVE SPACES TO WS-LINE
           STRING "                                  "
               "TOTAL COT.    " WS-FMT-MONTANT
               DELIMITED SIZE INTO WS-LINE
           MOVE WS-LINE TO OUTPUT-LINE
           WRITE OUTPUT-LINE.

      ******************************************************************
       9000-FIN.
      ******************************************************************
           CLOSE BULLETINS-FILE
           CLOSE OUTPUT-FILE

           DISPLAY "GENERATE-BULLETIN-TXT|DONE|" WS-RECORDS "|0".
