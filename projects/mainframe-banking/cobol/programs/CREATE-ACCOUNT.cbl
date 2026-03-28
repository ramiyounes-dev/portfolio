       IDENTIFICATION DIVISION.
       PROGRAM-ID. CREATE-ACCOUNT.
      *================================================================*
      * CREATE-ACCOUNT.cbl                                             *
      * Creates a new account with the next incremented account number *
      * Input:  OWNER-NAME, ACCT-TYPE, CURRENCY via command line args  *
      * Output: Pipe-delimited record to stdout                        *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNT-FILE
               ASSIGN TO WS-ACCT-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS ACCT-NUMBER
               FILE STATUS IS WS-FILE-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNT-FILE.
       COPY "ACCOUNT-RECORD.cpy".

       WORKING-STORAGE SECTION.
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-FILE-STATUS              PIC XX.
       01  WS-EOF                      PIC 9      VALUE 0.
       01  WS-MAX-ACCT-NUM             PIC 9(10)  VALUE 1000000000.
       01  WS-NEW-ACCT-NUM             PIC 9(10).
       01  WS-INPUT-OWNER              PIC X(30).
       01  WS-INPUT-TYPE               PIC X(8).
       01  WS-INPUT-CURRENCY           PIC X(3).
       01  WS-INPUT-BALANCE            PIC X(20).
       01  WS-INITIAL-BALANCE          PIC S9(13)V99 COMP-3.
       01  WS-DISPLAY-BAL              PIC -(13)9.99.
       01  WS-CURRENT-DATE.
           05  WS-DATE-YYYYMMDD        PIC 9(8).
           05  WS-DATE-HHMMSS          PIC 9(6).
           05  WS-DATE-HUNDREDTHS      PIC 9(2).
       01  WS-ARG-COUNT                PIC 9(2).

       PROCEDURE DIVISION.
       MAIN-PARA.
           ACCEPT WS-ACCT-PATH FROM ENVIRONMENT "DATA_DIR"
           STRING WS-ACCT-PATH DELIMITED SPACES
                  "/accounts.dat" DELIMITED SIZE
                  INTO WS-ACCT-PATH
           END-STRING

           ACCEPT WS-ARG-COUNT FROM ARGUMENT-NUMBER
           IF WS-ARG-COUNT < 3
               DISPLAY "ERROR|Missing arguments"
               STOP RUN
           END-IF

           ACCEPT WS-INPUT-OWNER FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-TYPE FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-CURRENCY FROM ARGUMENT-VALUE

           IF WS-ARG-COUNT >= 4
               ACCEPT WS-INPUT-BALANCE FROM ARGUMENT-VALUE
               COMPUTE WS-INITIAL-BALANCE =
                   FUNCTION NUMVAL(WS-INPUT-BALANCE)
           ELSE
               MOVE ZERO TO WS-INITIAL-BALANCE
           END-IF

           PERFORM FIND-MAX-ACCOUNT
           ADD 1 TO WS-MAX-ACCT-NUM
               GIVING WS-NEW-ACCT-NUM

           PERFORM WRITE-NEW-ACCOUNT
           STOP RUN.

       FIND-MAX-ACCOUNT.
           OPEN INPUT ACCOUNT-FILE
           IF WS-FILE-STATUS NOT = "00"
               IF WS-FILE-STATUS = "35"
                   OPEN OUTPUT ACCOUNT-FILE
                   CLOSE ACCOUNT-FILE
                   MOVE 1000000000 TO WS-MAX-ACCT-NUM
               ELSE
                   DISPLAY "ERROR|Cannot open accounts file: "
                       WS-FILE-STATUS
                   STOP RUN
               END-IF
           ELSE
               MOVE ZERO TO WS-EOF
               PERFORM UNTIL WS-EOF = 1
                   READ ACCOUNT-FILE NEXT
                       AT END
                           MOVE 1 TO WS-EOF
                       NOT AT END
                           IF ACCT-NUMBER > WS-MAX-ACCT-NUM
                               MOVE ACCT-NUMBER
                                   TO WS-MAX-ACCT-NUM
                           END-IF
                   END-READ
               END-PERFORM
               CLOSE ACCOUNT-FILE
           END-IF.

       WRITE-NEW-ACCOUNT.
           OPEN I-O ACCOUNT-FILE
           IF WS-FILE-STATUS = "35"
               OPEN OUTPUT ACCOUNT-FILE
           END-IF
           IF WS-FILE-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts for write: "
                   WS-FILE-STATUS
               STOP RUN
           END-IF

           INITIALIZE ACCOUNT-RECORD
           MOVE WS-NEW-ACCT-NUM       TO ACCT-NUMBER
           MOVE WS-INPUT-OWNER        TO ACCT-OWNER-NAME
           MOVE WS-INPUT-TYPE         TO ACCT-TYPE
           MOVE WS-INPUT-CURRENCY     TO ACCT-CURRENCY
           MOVE WS-INITIAL-BALANCE    TO ACCT-BALANCE
           MOVE "ACTIVE  "            TO ACCT-STATUS
           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           MOVE WS-DATE-YYYYMMDD      TO ACCT-OPEN-DATE

           WRITE ACCOUNT-RECORD
           IF WS-FILE-STATUS NOT = "00"
               DISPLAY "ERROR|Write failed: " WS-FILE-STATUS
               CLOSE ACCOUNT-FILE
               STOP RUN
           END-IF

           MOVE ACCT-BALANCE TO WS-DISPLAY-BAL
           DISPLAY "OK|"
               ACCT-NUMBER "|"
               ACCT-OWNER-NAME "|"
               ACCT-TYPE "|"
               ACCT-CURRENCY "|"
               WS-DISPLAY-BAL "|"
               ACCT-STATUS "|"
               ACCT-OPEN-DATE

           CLOSE ACCOUNT-FILE.
