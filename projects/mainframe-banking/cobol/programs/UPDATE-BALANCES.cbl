       IDENTIFICATION DIVISION.
       PROGRAM-ID. UPDATE-BALANCES.
      *================================================================*
      * UPDATE-BALANCES.cbl                                            *
      * Reads SORTED staging file, validates sort status,              *
      * applies each transaction to ACCOUNTS using appareillage        *
      * (lockstep walk of sorted files), appends to TRANSACTIONS,     *
      * advances batch state pointer                                   *
      * Output: Updated records pipe-delimited to stdout               *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SORTED-FILE
               ASSIGN TO WS-SORTED-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-SORT-STATUS.

           SELECT ACCOUNT-FILE
               ASSIGN TO WS-ACCT-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
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
       FD  SORTED-FILE.
       01  SORTED-RECORD.
           05  SR-TXN-ID              PIC 9(10).
           05  SR-TXN-TIMESTAMP       PIC 9(14).
           05  SR-TXN-ACCOUNT-NUM     PIC 9(10).
           05  SR-TXN-AMOUNT          PIC S9(13)V99 COMP-3.
           05  SR-TXN-TYPE            PIC X(10).
           05  SR-TXN-DESCRIPTION     PIC X(40).
           05  SR-TXN-CURRENCY        PIC X(3).
           05  SR-TXN-RUNNING-BAL     PIC S9(13)V99 COMP-3.
           05  SR-TXN-STATUS          PIC X(8).
           05  SR-TXN-BATCH-NUM       PIC 9(6).
           05  SR-FILLER              PIC X(39).

       FD  ACCOUNT-FILE.
       COPY "ACCOUNT-RECORD.cpy".

       FD  TRANS-FILE.
       01  COMMITTED-RECORD.
           05  CR-TXN-ID              PIC 9(10).
           05  CR-TXN-TIMESTAMP       PIC 9(14).
           05  CR-TXN-ACCOUNT-NUM     PIC 9(10).
           05  CR-TXN-AMOUNT          PIC S9(13)V99 COMP-3.
           05  CR-TXN-TYPE            PIC X(10).
           05  CR-TXN-DESCRIPTION     PIC X(40).
           05  CR-TXN-CURRENCY        PIC X(3).
           05  CR-TXN-RUNNING-BAL     PIC S9(13)V99 COMP-3.
           05  CR-TXN-STATUS          PIC X(8).
           05  CR-TXN-BATCH-NUM       PIC 9(6).
           05  CR-FILLER              PIC X(39).

       FD  BATCH-FILE.
       COPY "BATCH-STATE.cpy".

       WORKING-STORAGE SECTION.
       01  WS-SORTED-PATH             PIC X(256).
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-TRANS-PATH              PIC X(256).
       01  WS-BATCH-PATH              PIC X(256).
       01  WS-SORT-STATUS             PIC XX.
       01  WS-ACCT-STATUS             PIC XX.
       01  WS-TRANS-STATUS            PIC XX.
       01  WS-BATCH-STATUS            PIC XX.
       01  WS-DATA-DIR                PIC X(256).

       01  WS-EOF                     PIC 9       VALUE 0.
       01  WS-UPDATE-COUNT            PIC 9(10)   VALUE 0.
       01  WS-CONVERT-COUNT           PIC 9(10)   VALUE 0.
       01  WS-CURRENT-BATCH           PIC 9(6).
       01  WS-LAST-TXN-ID             PIC 9(10).
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-DISPLAY-BAL             PIC -(13)9.99.
       01  WS-NEW-BALANCE             PIC S9(13)V99 COMP-3.
       01  WS-CURRENT-DATE.
           05  WS-DATE-YYYYMMDD       PIC 9(8).
           05  WS-DATE-HHMMSS         PIC 9(6).
           05  WS-DATE-HUNDREDTHS     PIC 9(2).
       01  WS-TIMESTAMP               PIC 9(14).

      *    Currency conversion fields
       01  WS-TXN-RATE                PIC 9(7)V9(6).
       01  WS-ACCT-RATE               PIC 9(7)V9(6).
       01  WS-CONVERTED-AMT           PIC S9(13)V99 COMP-3.
       01  WS-DISPLAY-ORIG            PIC -(13)9.99.
       01  WS-CUR-IDX                 PIC 9(2).
       01  WS-RATE-FOUND              PIC 9       VALUE 0.

       COPY "CURRENCY-TABLE.cpy".

       PROCEDURE DIVISION.
       MAIN-PARA.
           MOVE CURRENCY-INIT-DATA TO CURRENCY-ENTRIES
           ACCEPT WS-DATA-DIR FROM ENVIRONMENT "DATA_DIR"
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/sorted-staging.dat" DELIMITED SIZE
                  INTO WS-SORTED-PATH
           END-STRING
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

           PERFORM VALIDATE-BATCH-SORTED
           PERFORM APPLY-TRANSACTIONS
           PERFORM ADVANCE-BATCH-STATE
           DISPLAY "UPDATE-COMPLETE|" WS-UPDATE-COUNT
               " transactions committed to accounts ("
               WS-CONVERT-COUNT " currency conversions)"
           STOP RUN.

       VALIDATE-BATCH-SORTED.
           OPEN INPUT BATCH-FILE
           IF WS-BATCH-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot read batch state: "
                   WS-BATCH-STATUS
               STOP RUN
           END-IF
           READ BATCH-FILE
               AT END
                   DISPLAY "ERROR|Empty batch state file"
                   CLOSE BATCH-FILE
                   STOP RUN
           END-READ
           IF NOT BATCH-SORTED
               DISPLAY "ERROR|Batch must be sorted before posting."
                   " Please sort first."
               CLOSE BATCH-FILE
               STOP RUN
           END-IF
           MOVE BATCH-SEQUENCE-NUM     TO WS-CURRENT-BATCH
           MOVE BATCH-LAST-TXN-ID      TO WS-LAST-TXN-ID
           CLOSE BATCH-FILE.

       APPLY-TRANSACTIONS.
      *    Open all files for the appareillage walk
           OPEN INPUT SORTED-FILE
           IF WS-SORT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open sorted file: "
                   WS-SORT-STATUS
               STOP RUN
           END-IF

           OPEN I-O ACCOUNT-FILE
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts: "
                   WS-ACCT-STATUS
               STOP RUN
           END-IF

           OPEN EXTEND TRANS-FILE
           IF WS-TRANS-STATUS = "35"
               CLOSE TRANS-FILE
               OPEN OUTPUT TRANS-FILE
           END-IF
           IF WS-TRANS-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open transactions: "
                   WS-TRANS-STATUS
               STOP RUN
           END-IF

      *    Appareillage: walk sorted transactions sequentially
      *    For each transaction, random-read the account by key,
      *    update balance, rewrite account, append to committed log
           MOVE ZERO TO WS-EOF
           PERFORM UNTIL WS-EOF = 1
               READ SORTED-FILE
                   AT END
                       MOVE 1 TO WS-EOF
                   NOT AT END
                       PERFORM PROCESS-ONE-TRANSACTION
               END-READ
           END-PERFORM

           CLOSE SORTED-FILE
           CLOSE ACCOUNT-FILE
           CLOSE TRANS-FILE.

       PROCESS-ONE-TRANSACTION.
           ADD 1 TO WS-UPDATE-COUNT

      *    Read the account record by key
           MOVE SR-TXN-ACCOUNT-NUM TO ACCT-NUMBER
           READ ACCOUNT-FILE
               INVALID KEY
                   PERFORM LOG-MISSING-ACCOUNT
           END-READ
           IF WS-ACCT-STATUS = "00" AND ACCT-STATUS-CLOSED
               PERFORM LOG-CLOSED-ACCOUNT
           END-IF
           IF WS-ACCT-STATUS = "00" AND NOT ACCT-STATUS-CLOSED
      *        Convert currency if transaction and account differ
               IF SR-TXN-CURRENCY NOT = ACCT-CURRENCY
                   PERFORM CONVERT-CURRENCY
                   ADD WS-CONVERTED-AMT TO ACCT-BALANCE
               ELSE
                   ADD SR-TXN-AMOUNT TO ACCT-BALANCE
               END-IF
               MOVE ACCT-BALANCE TO WS-NEW-BALANCE
               REWRITE ACCOUNT-RECORD
               IF WS-ACCT-STATUS NOT = "00"
                   DISPLAY "WARN|Rewrite failed for "
                       ACCT-NUMBER ": " WS-ACCT-STATUS
               END-IF

      *        Write committed transaction with running balance
               MOVE SR-TXN-ID          TO CR-TXN-ID
               MOVE SR-TXN-TIMESTAMP   TO CR-TXN-TIMESTAMP
               MOVE SR-TXN-ACCOUNT-NUM TO CR-TXN-ACCOUNT-NUM
               MOVE SR-TXN-AMOUNT      TO CR-TXN-AMOUNT
               MOVE SR-TXN-TYPE        TO CR-TXN-TYPE
               MOVE SR-TXN-DESCRIPTION TO CR-TXN-DESCRIPTION
               MOVE SR-TXN-CURRENCY    TO CR-TXN-CURRENCY
               MOVE WS-NEW-BALANCE     TO CR-TXN-RUNNING-BAL
               MOVE "COMMIT  "         TO CR-TXN-STATUS
               MOVE SR-TXN-BATCH-NUM   TO CR-TXN-BATCH-NUM
               MOVE SPACES             TO CR-FILLER
               WRITE COMMITTED-RECORD

               MOVE SR-TXN-AMOUNT TO WS-DISPLAY-AMT
               MOVE WS-NEW-BALANCE TO WS-DISPLAY-BAL
               DISPLAY "OK|"
                   CR-TXN-ID "|"
                   CR-TXN-TIMESTAMP "|"
                   CR-TXN-ACCOUNT-NUM "|"
                   CR-TXN-TYPE "|"
                   WS-DISPLAY-AMT "|"
                   CR-TXN-CURRENCY "|"
                   CR-TXN-DESCRIPTION "|"
                   "COMMIT  " "|"
                   CR-TXN-BATCH-NUM "|"
                   WS-DISPLAY-BAL
           END-IF.

       CONVERT-CURRENCY.
      *    Convert txn amount from txn currency to account currency
      *    Formula: amount * (txn_rate_to_usd / acct_rate_to_usd)
           MOVE ZERO TO WS-TXN-RATE
           MOVE ZERO TO WS-ACCT-RATE
           PERFORM VARYING WS-CUR-IDX FROM 1 BY 1
               UNTIL WS-CUR-IDX > CURRENCY-COUNT
               IF CUR-CODE(WS-CUR-IDX) = SR-TXN-CURRENCY
                   MOVE CUR-RATE-TO-USD(WS-CUR-IDX)
                       TO WS-TXN-RATE
               END-IF
               IF CUR-CODE(WS-CUR-IDX) = ACCT-CURRENCY
                   MOVE CUR-RATE-TO-USD(WS-CUR-IDX)
                       TO WS-ACCT-RATE
               END-IF
           END-PERFORM

           IF WS-TXN-RATE = ZERO OR WS-ACCT-RATE = ZERO
               DISPLAY "WARN|Unknown currency pair "
                   SR-TXN-CURRENCY "/" ACCT-CURRENCY
                   " for txn " SR-TXN-ID
                   " - applying unconverted"
               MOVE SR-TXN-AMOUNT TO WS-CONVERTED-AMT
           ELSE
               COMPUTE WS-CONVERTED-AMT ROUNDED =
                   SR-TXN-AMOUNT * (WS-TXN-RATE / WS-ACCT-RATE)
               ADD 1 TO WS-CONVERT-COUNT
               MOVE SR-TXN-AMOUNT TO WS-DISPLAY-ORIG
               MOVE WS-CONVERTED-AMT TO WS-DISPLAY-AMT
               DISPLAY "FX|"
                   SR-TXN-ID "|"
                   WS-DISPLAY-ORIG " " SR-TXN-CURRENCY " -> "
                   WS-DISPLAY-AMT " " ACCT-CURRENCY
           END-IF.

       LOG-MISSING-ACCOUNT.
      *    Account not found — log error, flag transaction as ALERT
           MOVE SR-TXN-AMOUNT TO WS-DISPLAY-AMT
           DISPLAY "ALERT|"
               SR-TXN-ID "|"
               SR-TXN-TIMESTAMP "|"
               SR-TXN-ACCOUNT-NUM "|"
               SR-TXN-TYPE "|"
               WS-DISPLAY-AMT "|"
               SR-TXN-CURRENCY "|"
               SR-TXN-DESCRIPTION "|"
               "ALERT   " "|"
               SR-TXN-BATCH-NUM
           DISPLAY "WARN|Account not found: "
               SR-TXN-ACCOUNT-NUM
               " - transaction " SR-TXN-ID " flagged as ALERT".

       LOG-CLOSED-ACCOUNT.
      *    Account is closed — log error, flag transaction as ALERT
           MOVE SR-TXN-AMOUNT TO WS-DISPLAY-AMT
           DISPLAY "ALERT|"
               SR-TXN-ID "|"
               SR-TXN-TIMESTAMP "|"
               SR-TXN-ACCOUNT-NUM "|"
               SR-TXN-TYPE "|"
               WS-DISPLAY-AMT "|"
               SR-TXN-CURRENCY "|"
               SR-TXN-DESCRIPTION "|"
               "ALERT   " "|"
               SR-TXN-BATCH-NUM
           DISPLAY "WARN|Account closed: "
               SR-TXN-ACCOUNT-NUM
               " - transaction " SR-TXN-ID " flagged as ALERT".

       ADVANCE-BATCH-STATE.
      *    Clear pending file (batch is now committed)
           OPEN OUTPUT SORTED-FILE
           CLOSE SORTED-FILE

      *    Clear pending buffer
           OPEN INPUT BATCH-FILE
           READ BATCH-FILE
           CLOSE BATCH-FILE

           OPEN OUTPUT BATCH-FILE
           INITIALIZE BATCH-STATE-RECORD
           MOVE WS-LAST-TXN-ID        TO BATCH-LAST-TXN-ID
           MOVE WS-LAST-TXN-ID        TO BATCH-LAST-COMMITTED
           ADD 1 TO WS-CURRENT-BATCH
           MOVE WS-CURRENT-BATCH       TO BATCH-SEQUENCE-NUM
           MOVE "IDLE    "             TO BATCH-STATUS
           MOVE ZERO                   TO BATCH-PENDING-COUNT
           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                  WS-DATE-HHMMSS   DELIMITED SIZE
                  INTO WS-TIMESTAMP
           END-STRING
           MOVE WS-TIMESTAMP           TO BATCH-TIMESTAMP
           WRITE BATCH-STATE-RECORD
           CLOSE BATCH-FILE.
