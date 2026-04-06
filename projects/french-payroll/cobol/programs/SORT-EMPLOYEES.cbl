       IDENTIFICATION DIVISION.
       PROGRAM-ID. SORT-EMPLOYEES.
      ******************************************************************
      * SORT-EMPLOYEES — Tri des employés par département puis matricule
      * Lit EMPLOYEES.dat (indexé), produit EMPLOYEES-SORTED.dat (séq.)
      ******************************************************************
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT EMPLOYEE-FILE
               ASSIGN TO WS-EMPLOYEE-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS SEQUENTIAL
               RECORD KEY IS EMP-MATRICULE
               FILE STATUS IS WS-FS-EMP.

           SELECT SORT-FILE
               ASSIGN TO WS-SORT-PATH.

           SELECT SORTED-FILE
               ASSIGN TO WS-SORTED-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-SRT.

       DATA DIVISION.
       FILE SECTION.
       FD  EMPLOYEE-FILE.
       COPY "EMPLOYEE-RECORD.cpy".

       SD  SORT-FILE.
       01  SORT-RECORD.
           05  SRT-DEPARTEMENT       PIC X(12).
           05  SRT-MATRICULE         PIC X(8).
           05  SRT-REST              PIC X(180).

       FD  SORTED-FILE.
       01  SORTED-RECORD             PIC X(200).

       WORKING-STORAGE SECTION.
       01  WS-EMPLOYEE-PATH          PIC X(256).
       01  WS-SORT-PATH              PIC X(256).
       01  WS-SORTED-PATH            PIC X(256).
       01  WS-FS-EMP                 PIC XX.
       01  WS-FS-SRT                 PIC XX.
       01  WS-RECORDS                PIC 9(6) VALUE 0.

       PROCEDURE DIVISION.
       0000-MAIN.
           ACCEPT WS-EMPLOYEE-PATH FROM ENVIRONMENT "EMPLOYEE_FILE"
           ACCEPT WS-SORTED-PATH FROM ENVIRONMENT "SORTED_FILE"

           IF WS-EMPLOYEE-PATH = SPACES
               MOVE "../data/EMPLOYEES.dat" TO WS-EMPLOYEE-PATH
           END-IF
           IF WS-SORTED-PATH = SPACES
               MOVE "../data/EMPLOYEES-SORTED.dat" TO WS-SORTED-PATH
           END-IF

           MOVE "sort-work" TO WS-SORT-PATH

           DISPLAY "SORT-EMPLOYEES|START|0|0"

           SORT SORT-FILE
               ON ASCENDING KEY SRT-DEPARTEMENT
               ON ASCENDING KEY SRT-MATRICULE
               INPUT PROCEDURE IS 1000-INPUT-SECTION
               OUTPUT PROCEDURE IS 2000-OUTPUT-SECTION

           DISPLAY "SORT-EMPLOYEES|DONE|" WS-RECORDS "|0"
           STOP RUN.

      ******************************************************************
       1000-INPUT-SECTION SECTION.
      ******************************************************************
       1000-INPUT-PROC.
           OPEN INPUT EMPLOYEE-FILE
           IF WS-FS-EMP NOT = "00"
               DISPLAY "SORT-EMPLOYEES|ERROR|0|OPEN=" WS-FS-EMP
               STOP RUN
           END-IF

           READ EMPLOYEE-FILE
               AT END GO TO 1000-INPUT-EXIT
           END-READ

           PERFORM UNTIL WS-FS-EMP = "10"
               IF EMP-ACTIF
                   MOVE EMP-DEPARTEMENT TO SRT-DEPARTEMENT
                   MOVE EMP-MATRICULE TO SRT-MATRICULE
                   MOVE EMPLOYEE-RECORD TO SORT-RECORD
                   RELEASE SORT-RECORD
               END-IF
               READ EMPLOYEE-FILE
                   AT END CONTINUE
               END-READ
           END-PERFORM.

       1000-INPUT-EXIT.
           CLOSE EMPLOYEE-FILE.

      ******************************************************************
       2000-OUTPUT-SECTION SECTION.
      ******************************************************************
       2000-OUTPUT-PROC.
           OPEN OUTPUT SORTED-FILE
           IF WS-FS-SRT NOT = "00"
               DISPLAY "SORT-EMPLOYEES|ERROR|0|OPEN-SRT=" WS-FS-SRT
               STOP RUN
           END-IF

           RETURN SORT-FILE
               AT END GO TO 2000-OUTPUT-EXIT
           END-RETURN

           PERFORM UNTIL 1 = 0
               MOVE SORT-RECORD TO SORTED-RECORD
               WRITE SORTED-RECORD
               ADD 1 TO WS-RECORDS
               RETURN SORT-FILE
                   AT END GO TO 2000-OUTPUT-EXIT
               END-RETURN
           END-PERFORM.

       2000-OUTPUT-EXIT.
           CLOSE SORTED-FILE.
