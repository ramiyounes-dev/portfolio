      ******************************************************************
      * PAIE-RECORD.cpy
      * Enregistrement bulletin de paie — fichier BULLETINS.dat
      * Organisation : SEQUENTIAL
      * Longueur enregistrement : 500 octets
      ******************************************************************
       01  PAIE-RECORD.
           05  PAI-MATRICULE          PIC X(8).
           05  PAI-PERIODE            PIC 9(6).
           05  PAI-NOM                PIC X(30).
           05  PAI-PRENOM             PIC X(25).
           05  PAI-DEPARTEMENT        PIC X(12).
           05  PAI-CLASSIFICATION     PIC X(10).
           05  PAI-DATE-PAIEMENT      PIC 9(8).
      *    --- Salaire de base ---
           05  PAI-HEURES-BASE        PIC S9(5)V99 COMP-3.
           05  PAI-TAUX-HORAIRE       PIC S9(5)V99 COMP-3.
           05  PAI-FORFAIT-MENSUEL    PIC S9(7)V99 COMP-3.
           05  PAI-SALAIRE-BASE       PIC S9(9)V99 COMP-3.
      *    --- Éléments variables ---
           05  PAI-HEURES-SUP-25      PIC S9(5)V99 COMP-3.
           05  PAI-MONTANT-HS-25      PIC S9(9)V99 COMP-3.
           05  PAI-HEURES-SUP-50      PIC S9(5)V99 COMP-3.
           05  PAI-MONTANT-HS-50      PIC S9(9)V99 COMP-3.
           05  PAI-PRIME-ANCIENNETE   PIC S9(9)V99 COMP-3.
           05  PAI-PRIME-EXCEPT       PIC S9(9)V99 COMP-3.
           05  PAI-ABSENCE-HEURES     PIC S9(5)V99 COMP-3.
           05  PAI-ABSENCE-MONTANT    PIC S9(9)V99 COMP-3.
           05  PAI-BRUT               PIC S9(9)V99 COMP-3.
      *    --- Cotisations salariales ---
           05  PAI-COT-MALADIE-SAL    PIC S9(9)V99 COMP-3.
           05  PAI-COT-VIEILL-PLAF    PIC S9(9)V99 COMP-3.
           05  PAI-COT-VIEILL-DEPLAF  PIC S9(9)V99 COMP-3.
           05  PAI-CSG-DEDUCTIBLE     PIC S9(9)V99 COMP-3.
           05  PAI-CSG-NON-DEDUCT     PIC S9(9)V99 COMP-3.
           05  PAI-COT-MUTUELLE-SAL   PIC S9(9)V99 COMP-3.
           05  PAI-COT-RETR-T1-SAL    PIC S9(9)V99 COMP-3.
           05  PAI-COT-RETR-T2-SAL    PIC S9(9)V99 COMP-3.
           05  PAI-COT-PREVOY-SAL     PIC S9(9)V99 COMP-3.
           05  PAI-COT-CHOMAGE-SAL    PIC S9(9)V99 COMP-3.
           05  PAI-COT-CEG-T1-SAL     PIC S9(9)V99 COMP-3.
           05  PAI-COT-CEG-T2-SAL     PIC S9(9)V99 COMP-3.
           05  PAI-TOTAL-COT-SAL      PIC S9(9)V99 COMP-3.
      *    --- Exonération loi TEPA sur HS ---
           05  PAI-EXONER-HS          PIC S9(9)V99 COMP-3.
      *    --- Net imposable et PAS ---
           05  PAI-NET-IMPOSABLE      PIC S9(9)V99 COMP-3.
           05  PAI-TAUX-PAS           PIC S9(3)V99 COMP-3.
           05  PAI-MONTANT-PAS        PIC S9(9)V99 COMP-3.
           05  PAI-NET-AVANT-PAS      PIC S9(9)V99 COMP-3.
           05  PAI-NET-A-PAYER        PIC S9(9)V99 COMP-3.
      *    --- Tranches pour calcul ---
           05  PAI-TRANCHE-1          PIC S9(9)V99 COMP-3.
           05  PAI-TRANCHE-2          PIC S9(9)V99 COMP-3.
           05  FILLER                 PIC X(76).
