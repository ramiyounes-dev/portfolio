      *================================================================*
      * TRANSACTION-RECORD.cpy                                        *
      * Record layout for TRANSACTIONS, PENDING, and SORTED files     *
      * ORGANIZATION IS SEQUENTIAL                                    *
      * Record length: 150 bytes                                      *
      *================================================================*
       01  TRANSACTION-RECORD.
           05  TXN-ID                  PIC 9(10).
           05  TXN-TIMESTAMP           PIC 9(14).
           05  TXN-ACCOUNT-NUM         PIC 9(10).
           05  TXN-AMOUNT              PIC S9(13)V99 COMP-3.
           05  TXN-TYPE                PIC X(10).
               88  TXN-TYPE-DEPOSIT    VALUE "DEPOSIT   ".
               88  TXN-TYPE-WITHDRAWAL VALUE "WITHDRAWAL".
               88  TXN-TYPE-TRANSFER   VALUE "TRANSFER  ".
               88  TXN-TYPE-PAYMENT    VALUE "PAYMENT   ".
               88  TXN-TYPE-CLOSURE    VALUE "CLOSURE   ".
           05  TXN-DESCRIPTION         PIC X(40).
           05  TXN-CURRENCY            PIC X(3).
           05  TXN-RUNNING-BAL         PIC S9(13)V99 COMP-3.
           05  TXN-STATUS              PIC X(8).
               88  TXN-COMMITTED       VALUE "COMMIT  ".
               88  TXN-PENDING         VALUE "PENDING ".
               88  TXN-SORTED          VALUE "SORTED  ".
           05  TXN-BATCH-NUM           PIC 9(6).
           05  FILLER                  PIC X(39).
