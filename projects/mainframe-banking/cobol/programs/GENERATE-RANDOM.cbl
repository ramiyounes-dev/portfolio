       IDENTIFICATION DIVISION.
       PROGRAM-ID. GENERATE-RANDOM.
      *================================================================*
      * GENERATE-RANDOM.cbl                                            *
      * Generates N random transactions across existing accounts       *
      * Appends all to the pending buffer as unsorted batch entries    *
      * Input: N (count) via argument                                  *
      * Output: Pipe-delimited records to stdout, one per line         *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNT-FILE
               ASSIGN TO WS-ACCT-PATH
               ORGANIZATION IS INDEXED
               ACCESS MODE IS DYNAMIC
               RECORD KEY IS ACCT-NUMBER
               FILE STATUS IS WS-ACCT-STATUS.

           SELECT PENDING-FILE
               ASSIGN TO WS-PENDING-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-PEND-STATUS.

           SELECT BATCH-FILE
               ASSIGN TO WS-BATCH-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-BATCH-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNT-FILE.
       COPY "ACCOUNT-RECORD.cpy".

       FD  PENDING-FILE.
       COPY "TRANSACTION-RECORD.cpy".

       FD  BATCH-FILE.
       COPY "BATCH-STATE.cpy".

       WORKING-STORAGE SECTION.
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-PENDING-PATH            PIC X(256).
       01  WS-BATCH-PATH              PIC X(256).
       01  WS-ACCT-STATUS             PIC XX.
       01  WS-PEND-STATUS             PIC XX.
       01  WS-BATCH-STATUS            PIC XX.
       01  WS-DATA-DIR                PIC X(256).

       01  WS-INPUT-COUNT             PIC X(10).
       01  WS-GEN-COUNT               PIC 9(4).
       01  WS-GEN-IDX                 PIC 9(4).
       01  WS-ARG-COUNT               PIC 9(2).

       01  WS-ACCT-TABLE.
           05  WS-ACCT-ENTRY OCCURS 100 TIMES.
               10  WS-AT-NUMBER       PIC 9(10).
               10  WS-AT-CURRENCY     PIC X(3).
               10  WS-AT-BALANCE      PIC S9(13)V99 COMP-3.
       01  WS-ACCT-COUNT              PIC 9(3)   VALUE 0.
       01  WS-EOF                     PIC 9      VALUE 0.

       01  WS-NEXT-TXN-ID             PIC 9(10).
       01  WS-CURRENT-BATCH           PIC 9(6).
       01  WS-PENDING-COUNT           PIC 9(10).

       01  WS-RAND                    PIC V9(8).
       01  WS-RAND-INT                PIC 9(4).
       01  WS-RAND-ACCT-IDX           PIC 9(3).
       01  WS-RAND-TYPE-IDX           PIC 9(1).
       01  WS-RAND-AMT                PIC 9(6)V99.
       01  WS-AMOUNT                  PIC S9(13)V99 COMP-3.
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-TXN-TYPE-VAL            PIC X(10).

       01  WS-DESC-TABLE.
           05  FILLER PIC X(24) VALUE "Payroll direct deposit  ".
           05  FILLER PIC X(24) VALUE "ATM withdrawal          ".
           05  FILLER PIC X(24) VALUE "Online purchase         ".
           05  FILLER PIC X(24) VALUE "Grocery store payment   ".
           05  FILLER PIC X(24) VALUE "Monthly rent payment    ".
           05  FILLER PIC X(24) VALUE "Wire transfer received  ".
           05  FILLER PIC X(24) VALUE "Utility bill payment    ".
           05  FILLER PIC X(24) VALUE "Restaurant charge       ".
           05  FILLER PIC X(24) VALUE "Insurance premium       ".
           05  FILLER PIC X(24) VALUE "Cash deposit at branch  ".
           05  FILLER PIC X(24) VALUE "Subscription service    ".
           05  FILLER PIC X(24) VALUE "Fuel station charge     ".
           05  FILLER PIC X(24) VALUE "Medical expense payment ".
           05  FILLER PIC X(24) VALUE "Tax refund credit       ".
           05  FILLER PIC X(24) VALUE "Loan installment        ".
           05  FILLER PIC X(24) VALUE "Dividend income credit  ".
           05  FILLER PIC X(24) VALUE "Travel expense airline  ".
           05  FILLER PIC X(24) VALUE "Interbank transfer      ".
           05  FILLER PIC X(24) VALUE "Mobile payment received ".
           05  FILLER PIC X(24) VALUE "Annual membership fee   ".
       01  WS-DESC-ARRAY REDEFINES WS-DESC-TABLE.
           05  WS-DESC-ENTRY PIC X(24) OCCURS 20.
       01  WS-RAND-DESC-IDX           PIC 9(2).

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
                  "/pending.dat" DELIMITED SIZE
                  INTO WS-PENDING-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/batch-state.dat" DELIMITED SIZE
                  INTO WS-BATCH-PATH
           END-STRING

           ACCEPT WS-ARG-COUNT FROM ARGUMENT-NUMBER
           IF WS-ARG-COUNT < 1
               DISPLAY "ERROR|Missing argument: count"
               STOP RUN
           END-IF
           ACCEPT WS-INPUT-COUNT FROM ARGUMENT-VALUE
           COMPUTE WS-GEN-COUNT =
               FUNCTION NUMVAL(WS-INPUT-COUNT)

           PERFORM LOAD-ACCOUNTS
           IF WS-ACCT-COUNT = 0
               DISPLAY "ERROR|No active accounts found"
               STOP RUN
           END-IF

           PERFORM READ-BATCH-STATE
           PERFORM OPEN-PENDING-FOR-APPEND
           PERFORM VARYING WS-GEN-IDX FROM 1 BY 1
               UNTIL WS-GEN-IDX > WS-GEN-COUNT
               PERFORM GENERATE-ONE-TXN
           END-PERFORM
           CLOSE PENDING-FILE
           PERFORM SAVE-BATCH-STATE
           STOP RUN.

       LOAD-ACCOUNTS.
           OPEN INPUT ACCOUNT-FILE
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts: " WS-ACCT-STATUS
               STOP RUN
           END-IF
           MOVE ZERO TO WS-ACCT-COUNT
           MOVE ZERO TO WS-EOF
           PERFORM UNTIL WS-EOF = 1
               READ ACCOUNT-FILE NEXT
                   AT END
                       MOVE 1 TO WS-EOF
                   NOT AT END
                       IF ACCT-STATUS = "ACTIVE  "
                           ADD 1 TO WS-ACCT-COUNT
                           MOVE ACCT-NUMBER
                               TO WS-AT-NUMBER(WS-ACCT-COUNT)
                           MOVE ACCT-CURRENCY
                               TO WS-AT-CURRENCY(WS-ACCT-COUNT)
                           MOVE ACCT-BALANCE
                               TO WS-AT-BALANCE(WS-ACCT-COUNT)
                       END-IF
               END-READ
           END-PERFORM
           CLOSE ACCOUNT-FILE.

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
           END-IF.

       OPEN-PENDING-FOR-APPEND.
           OPEN EXTEND PENDING-FILE
           IF WS-PEND-STATUS = "35"
               OPEN OUTPUT PENDING-FILE
           END-IF
           IF WS-PEND-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open pending: " WS-PEND-STATUS
               STOP RUN
           END-IF.

       GENERATE-ONE-TXN.
           COMPUTE WS-RAND = FUNCTION RANDOM
           COMPUTE WS-RAND-ACCT-IDX =
               FUNCTION MOD(
                   FUNCTION INTEGER(WS-RAND * 1000)
                   WS-ACCT-COUNT) + 1

           COMPUTE WS-RAND = FUNCTION RANDOM
           COMPUTE WS-RAND-TYPE-IDX =
               FUNCTION MOD(
                   FUNCTION INTEGER(WS-RAND * 100) 4) + 1

           EVALUATE WS-RAND-TYPE-IDX
               WHEN 1 MOVE "DEPOSIT   " TO WS-TXN-TYPE-VAL
               WHEN 2 MOVE "WITHDRAWAL" TO WS-TXN-TYPE-VAL
               WHEN 3 MOVE "TRANSFER  " TO WS-TXN-TYPE-VAL
               WHEN 4 MOVE "PAYMENT   " TO WS-TXN-TYPE-VAL
           END-EVALUATE

           COMPUTE WS-RAND = FUNCTION RANDOM
           COMPUTE WS-RAND-AMT =
               FUNCTION INTEGER(WS-RAND * 500000) / 100
           IF WS-RAND-AMT = 0
               MOVE 10.00 TO WS-RAND-AMT
           END-IF

           IF WS-TXN-TYPE-VAL = "DEPOSIT   "
               COMPUTE WS-AMOUNT = WS-RAND-AMT
           ELSE
               COMPUTE WS-AMOUNT = WS-RAND-AMT * -1
           END-IF

           COMPUTE WS-RAND = FUNCTION RANDOM
           COMPUTE WS-RAND-DESC-IDX =
               FUNCTION MOD(
                   FUNCTION INTEGER(WS-RAND * 1000) 20) + 1

           ADD 1 TO WS-NEXT-TXN-ID
           ADD 1 TO WS-PENDING-COUNT

           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                  WS-DATE-HHMMSS   DELIMITED SIZE
                  INTO WS-TIMESTAMP
           END-STRING

           INITIALIZE TRANSACTION-RECORD
           MOVE WS-NEXT-TXN-ID        TO TXN-ID
           MOVE WS-TIMESTAMP           TO TXN-TIMESTAMP
           MOVE WS-AT-NUMBER(WS-RAND-ACCT-IDX)
                                        TO TXN-ACCOUNT-NUM
           MOVE WS-AMOUNT              TO TXN-AMOUNT
           MOVE WS-TXN-TYPE-VAL        TO TXN-TYPE
           MOVE WS-DESC-ENTRY(WS-RAND-DESC-IDX)
                                        TO TXN-DESCRIPTION
           MOVE WS-AT-CURRENCY(WS-RAND-ACCT-IDX)
                                        TO TXN-CURRENCY
           MOVE ZERO                   TO TXN-RUNNING-BAL
           MOVE "PENDING "             TO TXN-STATUS
           MOVE WS-CURRENT-BATCH       TO TXN-BATCH-NUM

           WRITE TRANSACTION-RECORD
           IF WS-PEND-STATUS NOT = "00"
               DISPLAY "ERROR|Write failed: " WS-PEND-STATUS
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
               TXN-BATCH-NUM.

       SAVE-BATCH-STATE.
           OPEN OUTPUT BATCH-FILE
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
