       IDENTIFICATION DIVISION.
       PROGRAM-ID. LOAD-EMPLOYEES.
      ******************************************************************
      * LOAD-EMPLOYEES — Charge le fichier séquentiel EMPLOYEES-SEQ.dat
      * dans le fichier indexé EMPLOYEES.dat (clé = matricule)
      ******************************************************************
       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SEQ-FILE
               ASSIGN TO WS-SEQ-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-FS-SEQ.

           SELECT IDX-FILE
               ASSIGN TO WS-IDX-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS IDX-MATRICULE
               FILE STATUS IS WS-FS-IDX.

       DATA DIVISION.
       FILE SECTION.
       FD  SEQ-FILE.
       01  SEQ-RECORD                PIC X(200).

       FD  IDX-FILE.
       01  IDX-RECORD.
           05  IDX-MATRICULE         PIC X(8).
           05  IDX-REST              PIC X(192).

       WORKING-STORAGE SECTION.
       01  WS-SEQ-PATH              PIC X(256).
       01  WS-IDX-PATH              PIC X(256).
       01  WS-FS-SEQ                PIC XX.
       01  WS-FS-IDX                PIC XX.
       01  WS-EOF                   PIC 9 VALUE 0.
           88  EOF-SEQ              VALUE 1.
       01  WS-COUNT                 PIC 9(6) VALUE 0.

       PROCEDURE DIVISION.
       0000-MAIN.
           ACCEPT WS-SEQ-PATH FROM ENVIRONMENT "EMPLOYEE_SEQ_FILE"
           ACCEPT WS-IDX-PATH FROM ENVIRONMENT "EMPLOYEE_FILE"

           IF WS-SEQ-PATH = SPACES
               MOVE "../data/EMPLOYEES-SEQ.dat" TO WS-SEQ-PATH
           END-IF
           IF WS-IDX-PATH = SPACES
               MOVE "../data/EMPLOYEES.dat" TO WS-IDX-PATH
           END-IF

           OPEN INPUT SEQ-FILE
           IF WS-FS-SEQ NOT = "00"
               DISPLAY "LOAD-EMPLOYEES|ERROR|0|OPEN-SEQ=" WS-FS-SEQ
               STOP RUN
           END-IF

           OPEN OUTPUT IDX-FILE
           IF WS-FS-IDX NOT = "00"
               DISPLAY "LOAD-EMPLOYEES|ERROR|0|OPEN-IDX=" WS-FS-IDX
               CLOSE SEQ-FILE
               STOP RUN
           END-IF

           DISPLAY "LOAD-EMPLOYEES|START|0|0"

           READ SEQ-FILE
               AT END SET EOF-SEQ TO TRUE
           END-READ

           PERFORM UNTIL EOF-SEQ
               MOVE SEQ-RECORD TO IDX-RECORD
               WRITE IDX-RECORD
               IF WS-FS-IDX NOT = "00" AND WS-FS-IDX NOT = "02"
                   DISPLAY "LOAD-EMPLOYEES|ERROR|" WS-COUNT
                       "|WRITE-IDX=" WS-FS-IDX
               END-IF
               ADD 1 TO WS-COUNT
               READ SEQ-FILE
                   AT END SET EOF-SEQ TO TRUE
               END-READ
           END-PERFORM

           CLOSE SEQ-FILE
           CLOSE IDX-FILE

           DISPLAY "LOAD-EMPLOYEES|DONE|" WS-COUNT "|0"
           STOP RUN.
