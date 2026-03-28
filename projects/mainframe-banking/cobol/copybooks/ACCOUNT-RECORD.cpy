      *================================================================*
      * ACCOUNT-RECORD.cpy                                            *
      * Record layout for the indexed ACCOUNTS master file            *
      * ORGANIZATION IS INDEXED, RECORD KEY IS ACCT-NUMBER            *
      * Record length: 120 bytes                                      *
      *================================================================*
       01  ACCOUNT-RECORD.
           05  ACCT-NUMBER             PIC 9(10).
           05  ACCT-OWNER-NAME         PIC X(30).
           05  ACCT-TYPE               PIC X(8).
               88  ACCT-TYPE-CHECKING  VALUE "CHECKING".
               88  ACCT-TYPE-SAVINGS   VALUE "SAVINGS ".
               88  ACCT-TYPE-CREDIT    VALUE "CREDIT  ".
           05  ACCT-CURRENCY           PIC X(3).
               88  ACCT-CUR-USD        VALUE "USD".
               88  ACCT-CUR-EUR        VALUE "EUR".
               88  ACCT-CUR-GBP        VALUE "GBP".
               88  ACCT-CUR-LBP        VALUE "LBP".
               88  ACCT-CUR-JPY        VALUE "JPY".
           05  ACCT-BALANCE            PIC S9(13)V99 COMP-3.
           05  ACCT-STATUS             PIC X(8).
               88  ACCT-STATUS-ACTIVE  VALUE "ACTIVE  ".
               88  ACCT-STATUS-CLOSED  VALUE "CLOSED  ".
               88  ACCT-STATUS-FROZEN  VALUE "FROZEN  ".
           05  ACCT-OPEN-DATE          PIC 9(8).
           05  FILLER                  PIC X(55).
