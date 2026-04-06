      ******************************************************************
      * COTISATION-RECORD.cpy
      * Cotisations patronales par employé par mois
      * Organisation : SEQUENTIAL
      * Longueur enregistrement : 300 octets
      ******************************************************************
       01  COTISATION-RECORD.
           05  COT-MATRICULE          PIC X(8).
           05  COT-PERIODE            PIC 9(6).
           05  COT-NOM                PIC X(30).
           05  COT-PRENOM             PIC X(25).
           05  COT-DEPARTEMENT        PIC X(12).
           05  COT-CLASSIFICATION     PIC X(10).
           05  COT-BRUT               PIC S9(9)V99 COMP-3.
      *    --- Cotisations patronales ---
      *    Maladie-maternité-invalidité-décès
      *    Art. L241-2 CSS — 7.00% non-cadre / 13.00% cadre
           05  COT-MALADIE-PAT        PIC S9(9)V99 COMP-3.
      *    Vieillesse plafonnée — 8.55% sur T1
      *    Art. D242-4 CSS — Décret n°2014-1531
           05  COT-VIEILL-PLAF-PAT    PIC S9(9)V99 COMP-3.
      *    Vieillesse déplafonnée — 1.90% sur brut total
      *    Art. D242-4 CSS
           05  COT-VIEILL-DEPLAF-PAT  PIC S9(9)V99 COMP-3.
      *    Allocations familiales — 3.45% ou 5.25%
      *    Art. L241-6-1 CSS
           05  COT-ALLOC-FAM-PAT      PIC S9(9)V99 COMP-3.
      *    AT/MP — 2.22% (taux fixe seed)
      *    Art. L241-5 CSS
           05  COT-ATMP-PAT           PIC S9(9)V99 COMP-3.
      *    FNAL — 0.50% (entreprise >= 50 salariés)
      *    Art. L834-1 CSS
           05  COT-FNAL-PAT           PIC S9(9)V99 COMP-3.
      *    Retraite complémentaire AGIRC-ARRCO patronale
      *    ANI du 17 novembre 2017
           05  COT-RETR-T1-PAT        PIC S9(9)V99 COMP-3.
           05  COT-RETR-T2-PAT        PIC S9(9)V99 COMP-3.
      *    CEG patronal — 1.29% T1, 1.62% T2
      *    ANI du 17 novembre 2017
           05  COT-CEG-T1-PAT         PIC S9(9)V99 COMP-3.
           05  COT-CEG-T2-PAT         PIC S9(9)V99 COMP-3.
      *    Prévoyance patronale cadres — 1.50% T1 minimum
      *    ANI du 14 mars 1947, art. 7
           05  COT-PREVOY-PAT         PIC S9(9)V99 COMP-3.
      *    Chômage patronal — 4.05% T1+T2
      *    Convention Unédic
           05  COT-CHOMAGE-PAT        PIC S9(9)V99 COMP-3.
      *    AGS — 0.15% déplafonnée
      *    Art. L3253-18 Code du travail
           05  COT-AGS-PAT            PIC S9(9)V99 COMP-3.
      *    --- Total charges patronales ---
           05  COT-TOTAL-PAT          PIC S9(9)V99 COMP-3.
           05  FILLER                 PIC X(68).
