       IDENTIFICATION DIVISION.
       PROGRAM-ID. QUERY-ACCOUNT.
      *================================================================*
      * QUERY-ACCOUNT.cbl                                              *
      * Queries an account: returns metadata, balance, and full        *
      * committed transaction history for the given account number     *
      * Input: ACCT-NUMBER via argument                                *
      * Output: Pipe-delimited account + transaction records           *
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

       WORKING-STORAGE SECTION.
       01  WS-ACCT-PATH               PIC X(256).
       01  WS-TRANS-PATH              PIC X(256).
       01  WS-ACCT-STATUS             PIC XX.
       01  WS-TRANS-STATUS            PIC XX.
       01  WS-DATA-DIR                PIC X(256).

       01  WS-INPUT-ACCT              PIC X(10).
       01  WS-SEARCH-ACCT             PIC 9(10).
       01  WS-EOF                     PIC 9       VALUE 0.
       01  WS-TXN-COUNT               PIC 9(10)   VALUE 0.
       01  WS-DISPLAY-BAL             PIC -(13)9.99.
       01  WS-DISPLAY-AMT             PIC -(13)9.99.
       01  WS-ARG-COUNT               PIC 9(2).

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

           ACCEPT WS-ARG-COUNT FROM ARGUMENT-NUMBER
           IF WS-ARG-COUNT < 1
               DISPLAY "ERROR|Missing argument: account number"
               STOP RUN
           END-IF
           ACCEPT WS-INPUT-ACCT FROM ARGUMENT-VALUE
           MOVE WS-INPUT-ACCT TO WS-SEARCH-ACCT

           PERFORM QUERY-ACCOUNT-RECORD
           PERFORM QUERY-TRANSACTIONS
           DISPLAY "QUERY-COMPLETE|" WS-TXN-COUNT " transactions"
           STOP RUN.

       QUERY-ACCOUNT-RECORD.
           OPEN INPUT ACCOUNT-FILE
           IF WS-ACCT-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open accounts: " WS-ACCT-STATUS
               STOP RUN
           END-IF

           MOVE WS-SEARCH-ACCT TO ACCT-NUMBER
           READ ACCOUNT-FILE
               INVALID KEY
                   DISPLAY "ERROR|Account not found: " WS-SEARCH-ACCT
                   CLOSE ACCOUNT-FILE
                   STOP RUN
           END-READ

           MOVE ACCT-BALANCE TO WS-DISPLAY-BAL
           DISPLAY "ACCOUNT|"
               ACCT-NUMBER "|"
               ACCT-OWNER-NAME "|"
               ACCT-TYPE "|"
               ACCT-CURRENCY "|"
               WS-DISPLAY-BAL "|"
               ACCT-STATUS "|"
               ACCT-OPEN-DATE
           CLOSE ACCOUNT-FILE.

       QUERY-TRANSACTIONS.
           OPEN INPUT TRANS-FILE
           IF WS-TRANS-STATUS = "35"
               DISPLAY "INFO|No transaction history"
               STOP RUN
           END-IF
           IF WS-TRANS-STATUS NOT = "00"
               DISPLAY "ERROR|Cannot open transactions: "
                   WS-TRANS-STATUS
               STOP RUN
           END-IF

           MOVE ZERO TO WS-EOF
           PERFORM UNTIL WS-EOF = 1
               READ TRANS-FILE
                   AT END
                       MOVE 1 TO WS-EOF
                   NOT AT END
                       IF TXN-ACCOUNT-NUM = WS-SEARCH-ACCT
                           ADD 1 TO WS-TXN-COUNT
                           MOVE TXN-AMOUNT TO WS-DISPLAY-AMT
                           MOVE TXN-RUNNING-BAL
                               TO WS-DISPLAY-BAL
                           DISPLAY "TXN|"
                               TXN-ID "|"
                               TXN-TIMESTAMP "|"
                               TXN-ACCOUNT-NUM "|"
                               TXN-TYPE "|"
                               WS-DISPLAY-AMT "|"
                               TXN-CURRENCY "|"
                               TXN-DESCRIPTION "|"
                               TXN-STATUS "|"
                               TXN-BATCH-NUM "|"
                               WS-DISPLAY-BAL
                       END-IF
               END-READ
           END-PERFORM
           CLOSE TRANS-FILE.
