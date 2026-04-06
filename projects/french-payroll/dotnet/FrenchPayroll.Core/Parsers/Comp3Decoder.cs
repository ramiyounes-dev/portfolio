namespace FrenchPayroll.Core.Parsers;

/// <summary>
/// Decodes COBOL COMP-3 (packed decimal) fields into .NET decimal values.
/// COMP-3 stores each digit in a nibble, with the last nibble as the sign
/// (C=positive, D=negative, F=unsigned).
/// </summary>
public static class Comp3Decoder
{
    public static decimal Decode(ReadOnlySpan<byte> data, int decimalPlaces)
    {
        long intValue = 0;
        bool isNegative = false;

        for (int i = 0; i < data.Length; i++)
        {
            byte b = data[i];
            int highNibble = (b >> 4) & 0x0F;
            int lowNibble = b & 0x0F;

            if (i == data.Length - 1)
            {
                // Last byte: high nibble is digit, low nibble is sign
                intValue = intValue * 10 + highNibble;
                isNegative = lowNibble == 0x0D;
            }
            else
            {
                intValue = intValue * 10 + highNibble;
                intValue = intValue * 10 + lowNibble;
            }
        }

        decimal result = intValue;
        for (int i = 0; i < decimalPlaces; i++)
            result /= 10m;

        return isNegative ? -result : result;
    }
}
