using System.Text;

namespace FrenchPayroll.Core.Parsers;

/// <summary>
/// Generic fixed-width flat file parser matching COBOL copybook layouts.
/// Field offsets/lengths are defined per record type — if the COBOL
/// copybook changes, only the field definitions change, not this parser.
/// </summary>
public sealed class FlatFileParser
{
    private static readonly Encoding Encoding = Encoding.Latin1;

    public static List<T> ParseFile<T>(string filePath, int recordLength, FieldDef[] fields, Func<Dictionary<string, object>, T> mapper)
    {
        var results = new List<T>();
        var data = File.ReadAllBytes(filePath);

        for (int offset = 0; offset + recordLength <= data.Length; offset += recordLength)
        {
            var record = new Dictionary<string, object>();
            foreach (var field in fields)
            {
                int start = offset + field.Offset;
                if (start + field.Length > data.Length) break;

                var span = data.AsSpan(start, field.Length);

                object value = field.Type switch
                {
                    FieldType.Alphanumeric => Encoding.GetString(span).TrimEnd(),
                    FieldType.Numeric => int.TryParse(Encoding.GetString(span), out var n) ? n : 0,
                    FieldType.Comp3 => Comp3Decoder.Decode(span, field.DecimalPlaces),
                    _ => Encoding.GetString(span).TrimEnd()
                };

                record[field.Name] = value;
            }
            results.Add(mapper(record));
        }

        return results;
    }

    public static string GetString(Dictionary<string, object> record, string key)
        => record.TryGetValue(key, out var v) ? v?.ToString() ?? string.Empty : string.Empty;

    public static decimal GetDecimal(Dictionary<string, object> record, string key)
        => record.TryGetValue(key, out var v) && v is decimal d ? d : 0m;

    public static int GetInt(Dictionary<string, object> record, string key)
        => record.TryGetValue(key, out var v) && v is int i ? i : 0;
}
