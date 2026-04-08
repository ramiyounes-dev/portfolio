      ******************************************************************
      * JOURNAL-RECORD.cpy
      * Écriture comptable PCG — fichier JOURNAL-PCG.dat
      * Organisation : SEQUENTIAL
      * Longueur enregistrement : 148 octets
      ******************************************************************
       01  JOURNAL-RECORD.
           05  JRN-DATE               PIC 9(8).
           05  JRN-NUMERO-PIECE       PIC X(12).
           05  JRN-MATRICULE          PIC X(8).
           05  JRN-COMPTE-DEBIT       PIC X(6).
           05  JRN-COMPTE-CREDIT      PIC X(6).
           05  JRN-MONTANT            PIC S9(11)V99 COMP-3.
           05  JRN-LIBELLE            PIC X(50).
           05  JRN-TYPE-ECRITURE      PIC X(3).
               88  JRN-TYPE-SAL          VALUE "SAL".
               88  JRN-TYPE-COT          VALUE "COT".
               88  JRN-TYPE-PAS          VALUE "PAS".
               88  JRN-TYPE-NET          VALUE "NET".
               88  JRN-TYPE-PAT          VALUE "PAT".
               88  JRN-TYPE-TOT          VALUE "TOT".
           05  FILLER                 PIC X(48).
