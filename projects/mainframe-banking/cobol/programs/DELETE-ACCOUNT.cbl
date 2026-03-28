       IDENTIFICATION DIVISION.
       PROGRAM-ID. DELETE-ACCOUNT.
      *================================================================*
      * DELETE-ACCOUNT.cbl                                             *
      * Marks an account as CLOSED                                     *
      * Optionally appends a final CLOSURE withdrawal to drain balance *
      * Input: ACCT-NUMBER via argument                                *
      * Output: Pipe-delimited confirmation to stdout                  *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNT-FILE
               ASSIGN TO WS-ACCT-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS ACCT-NUMBER
               FILE STATUS IS WS-ACCT-STATUS.

           SELECT TRANS-FILE
               ASSIGN TO WS-TRANS-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-TRANS-STATUS.

           SELECT BATCH-FILE
               ASSIGN TO WS-BATCH-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-BATCH-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNT-FILE.
       COPY "ACCOUNT-RECORD.cpy".

       FD  TRANS-FILE.
       01  TRANSACTION-RECORD.
           05  TXN-ID                 PIC 9(10).
           05  TXN-TIMESTAMP          PIC 9(14).
           05  TXN-ACCOUNT-NUM        PIC 9(10).
           05  TXN-AMOUNT             PIC S9(13)V99 COMP-3.
           05  TXN-TYPE               PIC X(10).
           05  TXN-DESCRIPTION        PIC X(40).
           05  TXN-CURRENCY           PIC X(3).
           05  TXN-RUNNING-BAL        PIC S9(13)V99 COMP-3.
           05  TXN-STATUS             PIC X(8).
           05  TXN-BATCH-NUM          PIC 9(6).
           05  TXN-FILLER             PIC X(39).

       FD  BATCH-FILE.
       COPY "BATCH-STATE.cpy".

       WORKING-STORAGE SECTION.
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-TRANS-PATH              PIC X(256).
       01  WS-BATCH-PATH              PIC X(256).
       01  WS-ACCT-STATUS             PIC XX.
       01  WS-TRANS-STATUS            PIC XX.
       01  WS-BATCH-STATUS            PIC XX.
       01  WS-DATA-DIR                PIC X(256).

       01  WS-INPUT-ACCT              PIC X(10).
       01  WS-CLOSE-ACCT              PIC 9(10).
       01  WS-DRAIN-AMOUNT            PIC S9(13)V99 COMP-3.
       01  WS-DISPLAY-BAL             PIC -(13)9.99.
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-NEXT-TXN-ID             PIC 9(10).
       01  WS-CURRENT-BATCH           PIC 9(6).
       01  WS-SAVED-CURRENCY          PIC X(3).
       01  WS-ARG-COUNT               PIC 9(2).
       01  WS-CURRENT-DATE.
           05  WS-DATE-YYYYMMDD       PIC 9(8).
           05  WS-DATE-HHMMSS         PIC 9(6).
           05  WS-DATE-HUNDREDTHS     PIC 9(2).
       01  WS-TIMESTAMP               PIC 9(14).

       PROCEDURE DIVISION.
       MAIN-PARA.
           ACCEPT WS-DATA-DIR FROM ENVIRONMENT "DATA_DIR"
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/accounts.dat" DELIMITED SIZE
                  INTO WS-ACCT-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/transactions.dat" DELIMITED SIZE
                  INTO WS-TRANS-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/batch-state.dat" DELIMITED SIZE
                  INTO WS-BATCH-PATH
           END-STRING

           ACCEPT WS-ARG-COUNT FROM ARGUMENT-NUMBER
           IF WS-ARG-COUNT < 1
               DISPLAY "ERROR|Missing argument: account number"
               STOP RUN
           END-IF
           ACCEPT WS-INPUT-ACCT FROM ARGUMENT-VALUE
           MOVE WS-INPUT-ACCT TO WS-CLOSE-ACCT

           PERFORM READ-BATCH-STATE
           PERFORM CLOSE-ACCOUNT
           STOP RUN.

       READ-BATCH-STATE.
           OPEN INPUT BATCH-FILE
           IF WS-BATCH-STATUS = "35"
               MOVE 0 TO WS-NEXT-TXN-ID
               MOVE 1 TO WS-CURRENT-BATCH
           ELSE
               READ BATCH-FILE
                   AT END
                       MOVE 0 TO WS-NEXT-TXN-ID
                       MOVE 1 TO WS-CURRENT-BATCH
                   NOT AT END
                       MOVE BATCH-LAST-TXN-ID
                           TO WS-NEXT-TXN-ID
                       MOVE BATCH-SEQUENCE-NUM
                           TO WS-CURRENT-BATCH
               END-READ
               CLOSE BATCH-FILE
           END-IF.

       CLOSE-ACCOUNT.
           OPEN I-O ACCOUNT-FILE
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts: " WS-ACCT-STATUS
               STOP RUN
           END-IF

           MOVE WS-CLOSE-ACCT TO ACCT-NUMBER
           READ ACCOUNT-FILE
               INVALID KEY
                   DISPLAY "ERROR|Account not found: " WS-CLOSE-ACCT
                   CLOSE ACCOUNT-FILE
                   STOP RUN
           END-READ

           IF ACCT-STATUS-CLOSED
               DISPLAY "ERROR|Account already closed: " WS-CLOSE-ACCT
               CLOSE ACCOUNT-FILE
               STOP RUN
           END-IF

      *    Save account info before closure
           MOVE ACCT-CURRENCY TO WS-SAVED-CURRENCY

      *    If balance is non-zero, create a closure withdrawal
           IF ACCT-BALANCE NOT = ZERO
               COMPUTE WS-DRAIN-AMOUNT = ACCT-BALANCE * -1
               PERFORM WRITE-CLOSURE-TXN
           END-IF

      *    Mark account as closed with zero balance
           MOVE ZERO TO ACCT-BALANCE
           MOVE "CLOSED  " TO ACCT-STATUS
           REWRITE ACCOUNT-RECORD
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Rewrite failed: " WS-ACCT-STATUS
               CLOSE ACCOUNT-FILE
               STOP RUN
           END-IF

           DISPLAY "OK|CLOSED|" WS-CLOSE-ACCT
               "|Account closed successfully"
           CLOSE ACCOUNT-FILE.

       WRITE-CLOSURE-TXN.
           OPEN EXTEND TRANS-FILE
           IF WS-TRANS-STATUS = "35"
               CLOSE TRANS-FILE
               OPEN OUTPUT TRANS-FILE
           END-IF
           IF WS-TRANS-STATUS NOT = "00"
               DISPLAY "WARN|Cannot write closure txn: "
                   WS-TRANS-STATUS
           ELSE
               ADD 1 TO WS-NEXT-TXN-ID
               ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
               STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                      WS-DATE-HHMMSS   DELIMITED SIZE
                      INTO WS-TIMESTAMP
               END-STRING

               INITIALIZE TRANSACTION-RECORD
               MOVE WS-NEXT-TXN-ID    TO TXN-ID
               MOVE WS-TIMESTAMP       TO TXN-TIMESTAMP
               MOVE WS-CLOSE-ACCT     TO TXN-ACCOUNT-NUM
               MOVE WS-DRAIN-AMOUNT   TO TXN-AMOUNT
               MOVE "CLOSURE   "       TO TXN-TYPE
               MOVE "Account closure - balance drain"
                                        TO TXN-DESCRIPTION
               MOVE WS-SAVED-CURRENCY TO TXN-CURRENCY
               MOVE ZERO              TO TXN-RUNNING-BAL
               MOVE "COMMIT  "         TO TXN-STATUS
               MOVE WS-CURRENT-BATCH   TO TXN-BATCH-NUM

               WRITE TRANSACTION-RECORD
               MOVE WS-DRAIN-AMOUNT TO WS-DISPLAY-AMT
               DISPLAY "CLOSURE-TXN|"
                   TXN-ID "|"
                   WS-CLOSE-ACCT "|"
                   WS-DISPLAY-AMT "|"
                   WS-SAVED-CURRENCY "|"
                   "Account closure withdrawal"
               CLOSE TRANS-FILE
           END-IF.
