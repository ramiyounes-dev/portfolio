      *================================================================*
      * CURRENCY-TABLE.cpy                                            *
      * Static exchange rate table (rates relative to USD)            *
      * Used for multi-currency balance display and conversion        *
      *================================================================*
       01  CURRENCY-TABLE.
           05  CURRENCY-COUNT          PIC 9(2) VALUE 5.
           05  CURRENCY-ENTRIES.
               10  CURRENCY-ENTRY OCCURS 5 TIMES.
                   15  CUR-CODE        PIC X(3).
                   15  CUR-NAME        PIC X(20).
                   15  CUR-RATE-TO-USD PIC 9(7)V9(6).
                   15  CUR-DECIMALS    PIC 9(1).

       01  CURRENCY-INIT-DATA.
           05  FILLER                  PIC X(3)  VALUE "USD".
           05  FILLER                  PIC X(20) VALUE "US Dollar           ".
           05  FILLER                  PIC 9(7)V9(6) VALUE 1.000000.
           05  FILLER                  PIC 9(1) VALUE 2.

           05  FILLER                  PIC X(3)  VALUE "EUR".
           05  FILLER                  PIC X(20) VALUE "Euro                ".
           05  FILLER                  PIC 9(7)V9(6) VALUE 1.085000.
           05  FILLER                  PIC 9(1) VALUE 2.

           05  FILLER                  PIC X(3)  VALUE "GBP".
           05  FILLER                  PIC X(20) VALUE "British Pound       ".
           05  FILLER                  PIC 9(7)V9(6) VALUE 1.265000.
           05  FILLER                  PIC 9(1) VALUE 2.

           05  FILLER                  PIC X(3)  VALUE "LBP".
           05  FILLER                  PIC X(20) VALUE "Lebanese Pound      ".
           05  FILLER                  PIC 9(7)V9(6) VALUE 0.000011.
           05  FILLER                  PIC 9(1) VALUE 0.

           05  FILLER                  PIC X(3)  VALUE "JPY".
           05  FILLER                  PIC X(20) VALUE "Japanese Yen        ".
           05  FILLER                  PIC 9(7)V9(6) VALUE 0.006670.
           05  FILLER                  PIC 9(1) VALUE 0.
