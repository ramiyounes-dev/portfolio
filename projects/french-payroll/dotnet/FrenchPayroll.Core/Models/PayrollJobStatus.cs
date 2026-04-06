namespace FrenchPayroll.Core.Models;

public sealed class PayrollJobStatus
{
    public string JobId { get; set; } = string.Empty;
    public string Status { get; set; } = "queued"; // queued | running | done | error
    public int Periode { get; set; }
    public List<string> OutputLines { get; set; } = [];
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int RecordsProcessed { get; set; }
    public int Errors { get; set; }
}
