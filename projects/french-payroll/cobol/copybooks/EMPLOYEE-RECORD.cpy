      ******************************************************************
      * EMPLOYEE-RECORD.cpy
      * Enregistrement employé — fichier EMPLOYEES.dat
      * Organisation : INDEXED, clé primaire = EMP-MATRICULE
      * Longueur enregistrement : 200 octets
      ******************************************************************
       01  EMPLOYEE-RECORD.
           05  EMP-MATRICULE          PIC X(8).
           05  EMP-NTT                PIC X(15).
           05  EMP-NOM                PIC X(30).
           05  EMP-PRENOM             PIC X(25).
           05  EMP-DEPARTEMENT        PIC X(12).
               88  EMP-DEPT-COMMERCIAL   VALUE "COMMERCIAL  ".
               88  EMP-DEPT-TECHNIQUE    VALUE "TECHNIQUE   ".
               88  EMP-DEPT-RH           VALUE "RH          ".
               88  EMP-DEPT-DIRECTION    VALUE "DIRECTION   ".
           05  EMP-CLASSIFICATION     PIC X(10).
               88  EMP-NON-CADRE         VALUE "NON-CADRE ".
               88  EMP-CADRE             VALUE "CADRE     ".
               88  EMP-CADRE-DIR         VALUE "CADRE-DIR ".
           05  EMP-TAUX-HORAIRE       PIC S9(5)V99 COMP-3.
           05  EMP-FORFAIT-MENSUEL    PIC S9(7)V99 COMP-3.
           05  EMP-TAUX-PAS           PIC S9(3)V99 COMP-3.
           05  EMP-DATE-ENTREE        PIC 9(8).
           05  EMP-ANCIENNETE-ANNEES  PIC 9(2).
           05  EMP-STATUT             PIC X(7).
               88  EMP-ACTIF             VALUE "ACTIF  ".
               88  EMP-INACTIF           VALUE "INACTIF".
           05  EMP-HEURES-MENSUELLES  PIC 9(5)V99 COMP-3.
           05  FILLER                 PIC X(68).
