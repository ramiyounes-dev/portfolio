       IDENTIFICATION DIVISION.
       PROGRAM-ID. SORT-BATCH.
      *================================================================*
      * SORT-BATCH.cbl                                                 *
      * Reads all pending transactions, sorts by account number        *
      * using COBOL SORT verb (mainframe-style merge sort),            *
      * writes to SORTED staging file, updates batch state             *
      * Output: Sorted records pipe-delimited to stdout                *
      *================================================================*

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT PENDING-FILE
               ASSIGN TO WS-PENDING-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-PEND-STATUS.

           SELECT SORTED-FILE
               ASSIGN TO WS-SORTED-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-SORT-STATUS.

           SELECT SORT-WORK
               ASSIGN TO WS-SORT-WORK-PATH.

           SELECT BATCH-FILE
               ASSIGN TO WS-BATCH-PATH
               ORGANIZATION IS SEQUENTIAL
               FILE STATUS IS WS-BATCH-STATUS.

       DATA DIVISION.
       FILE SECTION.
       FD  PENDING-FILE.
       COPY "TRANSACTION-RECORD.cpy".

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

       SD  SORT-WORK.
       01  SORT-RECORD.
           05  SW-TXN-ID              PIC 9(10).
           05  SW-TXN-TIMESTAMP       PIC 9(14).
           05  SW-TXN-ACCOUNT-NUM     PIC 9(10).
           05  SW-TXN-AMOUNT          PIC S9(13)V99 COMP-3.
           05  SW-TXN-TYPE            PIC X(10).
           05  SW-TXN-DESCRIPTION     PIC X(40).
           05  SW-TXN-CURRENCY        PIC X(3).
           05  SW-TXN-RUNNING-BAL     PIC S9(13)V99 COMP-3.
           05  SW-TXN-STATUS          PIC X(8).
           05  SW-TXN-BATCH-NUM       PIC 9(6).
           05  SW-FILLER              PIC X(39).

       FD  BATCH-FILE.
       COPY "BATCH-STATE.cpy".

       WORKING-STORAGE SECTION.
       01  WS-PENDING-PATH            PIC X(256).
       01  WS-SORTED-PATH             PIC X(256).
       01  WS-SORT-WORK-PATH          PIC X(256).
       01  WS-BATCH-PATH              PIC X(256).
       01  WS-PEND-STATUS             PIC XX.
       01  WS-SORT-STATUS             PIC XX.
       01  WS-BATCH-STATUS            PIC XX.
       01  WS-DATA-DIR                PIC X(256).
       01  WS-EOF                     PIC 9       VALUE 0.
       01  WS-SORT-COUNT              PIC 9(10)   VALUE 0.
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-CURRENT-BATCH           PIC 9(6).
       01  WS-LAST-TXN-ID             PIC 9(10).
       01  WS-PENDING-COUNT           PIC 9(10).
       01  WS-CURRENT-DATE.
           05  WS-DATE-YYYYMMDD       PIC 9(8).
           05  WS-DATE-HHMMSS         PIC 9(6).
           05  WS-DATE-HUNDREDTHS     PIC 9(2).
       01  WS-TIMESTAMP               PIC 9(14).

       PROCEDURE DIVISION.
       MAIN-PARA.
           ACCEPT WS-DATA-DIR FROM ENVIRONMENT "DATA_DIR"
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/pending.dat" DELIMITED SIZE
                  INTO WS-PENDING-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/sorted-staging.dat" DELIMITED SIZE
                  INTO WS-SORTED-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/sort-work.tmp" DELIMITED SIZE
                  INTO WS-SORT-WORK-PATH
           END-STRING
           STRING WS-DATA-DIR DELIMITED SPACES
                  "/batch-state.dat" DELIMITED SIZE
                  INTO WS-BATCH-PATH
           END-STRING

           PERFORM CHECK-BATCH-STATE
           PERFORM EXECUTE-SORT
           PERFORM OUTPUT-SORTED-RECORDS
           PERFORM UPDATE-BATCH-SORTED
           STOP RUN.

       CHECK-BATCH-STATE.
           OPEN INPUT BATCH-FILE
           IF WS-BATCH-STATUS = "35"
               DISPLAY "ERROR|No batch state found"
               STOP RUN
           END-IF
           READ BATCH-FILE
               AT END
                   DISPLAY "ERROR|Empty batch state"
                   CLOSE BATCH-FILE
                   STOP RUN
           END-READ
           IF BATCH-SORTED
               DISPLAY "ERROR|Batch already sorted - run update first"
               CLOSE BATCH-FILE
               STOP RUN
           END-IF
           IF BATCH-PENDING-COUNT = 0
               DISPLAY "ERROR|No pending transactions to sort"
               CLOSE BATCH-FILE
               STOP RUN
           END-IF
           MOVE BATCH-SEQUENCE-NUM     TO WS-CURRENT-BATCH
           MOVE BATCH-LAST-TXN-ID      TO WS-LAST-TXN-ID
           MOVE BATCH-PENDING-COUNT    TO WS-PENDING-COUNT
           CLOSE BATCH-FILE.

       EXECUTE-SORT.
           SORT SORT-WORK
               ON ASCENDING KEY SW-TXN-ACCOUNT-NUM
               ON ASCENDING KEY SW-TXN-TIMESTAMP
               USING PENDING-FILE
               GIVING SORTED-FILE.

       OUTPUT-SORTED-RECORDS.
           OPEN INPUT SORTED-FILE
           IF WS-SORT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open sorted file: "
                   WS-SORT-STATUS
               STOP RUN
           END-IF
           MOVE ZERO TO WS-EOF
           MOVE ZERO TO WS-SORT-COUNT
           PERFORM UNTIL WS-EOF = 1
               READ SORTED-FILE
                   AT END
                       MOVE 1 TO WS-EOF
                   NOT AT END
                       ADD 1 TO WS-SORT-COUNT
                       MOVE SR-TXN-AMOUNT TO WS-DISPLAY-AMT
                       DISPLAY "OK|"
                           SR-TXN-ID "|"
                           SR-TXN-TIMESTAMP "|"
                           SR-TXN-ACCOUNT-NUM "|"
                           SR-TXN-TYPE "|"
                           WS-DISPLAY-AMT "|"
                           SR-TXN-CURRENCY "|"
                           SR-TXN-DESCRIPTION "|"
                           "SORTED  " "|"
                           SR-TXN-BATCH-NUM
               END-READ
           END-PERFORM
           CLOSE SORTED-FILE
           DISPLAY "SORT-COMPLETE|" WS-SORT-COUNT
               " records sorted by account number".

       UPDATE-BATCH-SORTED.
           OPEN OUTPUT BATCH-FILE
           INITIALIZE BATCH-STATE-RECORD
           MOVE WS-LAST-TXN-ID        TO BATCH-LAST-TXN-ID
           MOVE WS-CURRENT-BATCH       TO BATCH-SEQUENCE-NUM
           MOVE "SORTED  "             TO BATCH-STATUS
           MOVE WS-PENDING-COUNT       TO BATCH-PENDING-COUNT
           MOVE WS-LAST-TXN-ID        TO BATCH-LAST-COMMITTED
           ACCEPT WS-CURRENT-DATE FROM DATE YYYYMMDD
           STRING WS-DATE-YYYYMMDD DELIMITED SIZE
                  WS-DATE-HHMMSS   DELIMITED SIZE
                  INTO WS-TIMESTAMP
           END-STRING
           MOVE WS-TIMESTAMP           TO BATCH-TIMESTAMP
           WRITE BATCH-STATE-RECORD
           CLOSE BATCH-FILE.
