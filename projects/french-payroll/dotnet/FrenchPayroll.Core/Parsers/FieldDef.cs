namespace FrenchPayroll.Core.Parsers;

/// <summary>
/// Defines a field within a fixed-width COBOL record.
/// </summary>
public sealed class FieldDef
{
    public string Name { get; }
    public int Offset { get; }
    public int Length { get; }
    public FieldType Type { get; }
    public int DecimalPlaces { get; }

    public FieldDef(string name, int offset, int length, FieldType type, int decimalPlaces = 0)
    {
        Name = name;
        Offset = offset;
        Length = length;
        Type = type;
        DecimalPlaces = decimalPlaces;
    }
}

public enum FieldType
{
    Alphanumeric,   // PIC X(n)
    Numeric,        // PIC 9(n)
    Comp3           // PIC S9(n)V99 COMP-3
}
