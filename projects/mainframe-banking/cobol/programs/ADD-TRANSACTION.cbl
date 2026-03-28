       IDENTIFICATION DIVISION.
       PROGRAM-ID. ADD-TRANSACTION.
      *================================================================*
      * ADD-TRANSACTION.cbl                                            *
      * Appends one new transaction to the PENDING buffer              *
      * Does NOT update account balances                               *
      * Input: ACCT-NUM, AMOUNT, TYPE, DESC, CURRENCY via args        *
      * Output: Pipe-delimited transaction record to stdout            *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT PENDING-FILE
               ASSIGN TO WS-PENDING-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-PEND-STATUS.

           SELECT BATCH-FILE
               ASSIGN TO WS-BATCH-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-BATCH-STATUS.

           SELECT ACCOUNT-FILE
               ASSIGN TO WS-ACCT-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS RANDOM
               RECORD KEY IS ACCT-NUMBER
               FILE STATUS IS WS-ACCT-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  PENDING-FILE.
       COPY "TRANSACTION-RECORD.cpy".

       FD  BATCH-FILE.
       COPY "BATCH-STATE.cpy".

       FD  ACCOUNT-FILE.
       COPY "ACCOUNT-RECORD.cpy".

       WORKING-STORAGE SECTION.
       01  WS-PENDING-PATH            PIC X(256).
       01  WS-BATCH-PATH              PIC X(256).
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-PEND-STATUS             PIC XX.
       01  WS-BATCH-STATUS            PIC XX.
       01  WS-ACCT-STATUS             PIC XX.
       01  WS-DATA-DIR                PIC X(256).
       01  WS-INPUT-ACCT              PIC X(10).
       01  WS-INPUT-AMOUNT            PIC X(20).
       01  WS-INPUT-TYPE              PIC X(10).
       01  WS-INPUT-DESC              PIC X(40).
       01  WS-INPUT-CURRENCY          PIC X(3).
       01  WS-NEXT-TXN-ID             PIC 9(10).
       01  WS-CURRENT-BATCH           PIC 9(6).
       01  WS-PENDING-COUNT           PIC 9(10).
       01  WS-AMOUNT                  PIC S9(13)V99 COMP-3.
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-CURRENT-DATE.
           05  WS-DATE-YYYYMMDD       PIC 9(8).
           05  WS-DATE-HHMMSS         PIC 9(6).
           05  WS-DATE-HUNDREDTHS     PIC 9(2).
       01  WS-TIMESTAMP               PIC 9(14).
       01  WS-ARG-COUNT               PIC 9(2).
       01  WS-ACCT-CREATED            PIC 9      VALUE 0.
       01  WS-DISPLAY-BAL             PIC -(13)9.99.

       PROCEDURE DIVISION.
       MAIN-PARA.
           ACCEPT WS-DATA-DIR FROM ENVIRONMENT "DATA_DIR"
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/pending.dat" DELIMITED SIZE
                  INTO WS-PENDING-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/batch-state.dat" DELIMITED SIZE
                  INTO WS-BATCH-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/accounts.dat" DELIMITED SIZE
                  INTO WS-ACCT-PATH
           END-STRING

           ACCEPT WS-ARG-COUNT FROM ARGUMENT-NUMBER
           IF WS-ARG-COUNT < 5
               DISPLAY "ERROR|Missing args: ACCT AMT TYPE DESC CUR"
               STOP RUN
           END-IF

           ACCEPT WS-INPUT-ACCT FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-AMOUNT FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-TYPE FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-DESC FROM ARGUMENT-VALUE
           ACCEPT WS-INPUT-CURRENCY FROM ARGUMENT-VALUE

           COMPUTE WS-AMOUNT = FUNCTION NUMVAL(WS-INPUT-AMOUNT)

           PERFORM VALIDATE-ACCOUNT
           PERFORM READ-BATCH-STATE
           PERFORM APPEND-PENDING
           PERFORM UPDATE-BATCH-PENDING-COUNT
           STOP RUN.

       VALIDATE-ACCOUNT.
           OPEN I-O ACCOUNT-FILE
           IF WS-ACCT-STATUS = "35"
               OPEN OUTPUT ACCOUNT-FILE
               CLOSE ACCOUNT-FILE
               OPEN I-O ACCOUNT-FILE
           END-IF
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts: "
                   WS-ACCT-STATUS
               STOP RUN
           END-IF
           MOVE WS-INPUT-ACCT TO ACCT-NUMBER
           READ ACCOUNT-FILE
               INVALID KEY
                   PERFORM AUTO-CREATE-ACCOUNT
           END-READ
           IF ACCT-STATUS-CLOSED
               DISPLAY "ERROR|Account is closed: "
                   WS-INPUT-ACCT
               CLOSE ACCOUNT-FILE
               STOP RUN
           END-IF
           CLOSE ACCOUNT-FILE.

       AUTO-CREATE-ACCOUNT.
      *    Account not found — create it automatically
           INITIALIZE ACCOUNT-RECORD
           MOVE WS-INPUT-ACCT     TO ACCT-NUMBER
           MOVE "Auto-created"     TO ACCT-OWNER-NAME
           MOVE "CHECKING"         TO ACCT-TYPE
           MOVE WS-INPUT-CURRENCY TO ACCT-CURRENCY
           MOVE ZERO              TO ACCT-BALANCE
           MOVE "ACTIVE  "         TO ACCT-STATUS
           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           MOVE WS-DATE-YYYYMMDD  TO ACCT-OPEN-DATE
           WRITE ACCOUNT-RECORD
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Auto-create failed: "
                   WS-ACCT-STATUS
               CLOSE ACCOUNT-FILE
               STOP RUN
           END-IF
           MOVE 1 TO WS-ACCT-CREATED
           MOVE ACCT-BALANCE TO WS-DISPLAY-BAL
           DISPLAY "NEW-ACCT|"
               ACCT-NUMBER "|"
               ACCT-OWNER-NAME "|"
               ACCT-TYPE "|"
               ACCT-CURRENCY "|"
               WS-DISPLAY-BAL "|"
               ACCT-STATUS "|"
               ACCT-OPEN-DATE.

       READ-BATCH-STATE.
           OPEN INPUT BATCH-FILE
           IF WS-BATCH-STATUS = "35"
               MOVE 0          TO WS-NEXT-TXN-ID
               MOVE 1          TO WS-CURRENT-BATCH
               MOVE 0          TO WS-PENDING-COUNT
           ELSE
               READ BATCH-FILE
                   AT END
                       MOVE 0  TO WS-NEXT-TXN-ID
                       MOVE 1  TO WS-CURRENT-BATCH
                       MOVE 0  TO WS-PENDING-COUNT
                   NOT AT END
                       MOVE BATCH-LAST-TXN-ID
                           TO WS-NEXT-TXN-ID
                       MOVE BATCH-SEQUENCE-NUM
                           TO WS-CURRENT-BATCH
                       MOVE BATCH-PENDING-COUNT
                           TO WS-PENDING-COUNT
               END-READ
               CLOSE BATCH-FILE
           END-IF
           ADD 1 TO WS-NEXT-TXN-ID.

       APPEND-PENDING.
           OPEN EXTEND PENDING-FILE
           IF WS-PEND-STATUS = "35"
               OPEN OUTPUT PENDING-FILE
           END-IF
           IF WS-PEND-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open pending: " WS-PEND-STATUS
               STOP RUN
           END-IF

           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                  WS-DATE-HHMMSS   DELIMITED SIZE
                  INTO WS-TIMESTAMP
           END-STRING

           INITIALIZE TRANSACTION-RECORD
           MOVE WS-NEXT-TXN-ID        TO TXN-ID
           MOVE WS-TIMESTAMP           TO TXN-TIMESTAMP
           MOVE WS-INPUT-ACCT          TO TXN-ACCOUNT-NUM
           MOVE WS-AMOUNT              TO TXN-AMOUNT
           MOVE WS-INPUT-TYPE          TO TXN-TYPE
           MOVE WS-INPUT-DESC          TO TXN-DESCRIPTION
           MOVE WS-INPUT-CURRENCY      TO TXN-CURRENCY
           MOVE ZERO                   TO TXN-RUNNING-BAL
           MOVE "PENDING "             TO TXN-STATUS
           MOVE WS-CURRENT-BATCH       TO TXN-BATCH-NUM

           WRITE TRANSACTION-RECORD
           IF WS-PEND-STATUS NOT = "00"
               DISPLAY "ERROR|Write pending failed: " WS-PEND-STATUS
               CLOSE PENDING-FILE
               STOP RUN
           END-IF

           MOVE TXN-AMOUNT TO WS-DISPLAY-AMT
           DISPLAY "OK|"
               TXN-ID "|"
               TXN-TIMESTAMP "|"
               TXN-ACCOUNT-NUM "|"
               TXN-TYPE "|"
               WS-DISPLAY-AMT "|"
               TXN-CURRENCY "|"
               TXN-DESCRIPTION "|"
               TXN-STATUS "|"
               TXN-BATCH-NUM

           CLOSE PENDING-FILE.

       UPDATE-BATCH-PENDING-COUNT.
           OPEN OUTPUT BATCH-FILE
           ADD 1 TO WS-PENDING-COUNT
           INITIALIZE BATCH-STATE-RECORD
           MOVE WS-NEXT-TXN-ID        TO BATCH-LAST-TXN-ID
           MOVE WS-CURRENT-BATCH       TO BATCH-SEQUENCE-NUM
           MOVE "IDLE    "             TO BATCH-STATUS
           MOVE WS-PENDING-COUNT       TO BATCH-PENDING-COUNT
           MOVE WS-NEXT-TXN-ID        TO BATCH-LAST-COMMITTED
           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                  WS-DATE-HHMMSS   DELIMITED SIZE
                  INTO WS-TIMESTAMP
           END-STRING
           MOVE WS-TIMESTAMP           TO BATCH-TIMESTAMP
           WRITE BATCH-STATE-RECORD
           CLOSE BATCH-FILE.
