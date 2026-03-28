      *================================================================*
      * BATCH-STATE.cpy                                               *
      * Tracks the last committed batch offset and sequence number    *
      * Single-record file: one row tracking batch processing state   *
      * Record length: 80 bytes                                       *
      *================================================================*
       01  BATCH-STATE-RECORD.
           05  BATCH-LAST-COMMITTED    PIC 9(10).
           05  BATCH-SEQUENCE-NUM      PIC 9(6).
           05  BATCH-STATUS            PIC X(8).
               88  BATCH-IDLE          VALUE "IDLE    ".
               88  BATCH-SORTED        VALUE "SORTED  ".
               88  BATCH-POSTING       VALUE "POSTING ".
           05  BATCH-PENDING-COUNT     PIC 9(10).
           05  BATCH-LAST-TXN-ID       PIC 9(10).
           05  BATCH-TIMESTAMP         PIC 9(14).
           05  FILLER                  PIC X(22).
