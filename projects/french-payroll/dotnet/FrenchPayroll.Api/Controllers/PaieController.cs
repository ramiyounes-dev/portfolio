using FrenchPayroll.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/paie")]
public sealed class PaieController : ControllerBase
{
    private readonly CobolProcessService _cobol;

    public PaieController(CobolProcessService cobol) => _cobol = cobol;

    [HttpPost("run/{periode:int}")]
    public IActionResult RunPayroll(int periode)
    {
        var jobId = _cobol.StartPayrollRun(periode);
        return Accepted(new { jobId, status = "queued" });
    }

    [HttpPost("sort")]
    public IActionResult RunSort()
    {
        var jobId = _cobol.StartSort();
        return Accepted(new { jobId, status = "queued" });
    }

    [HttpGet("status/{jobId}")]
    public IActionResult GetStatus(string jobId)
    {
        var job = _cobol.GetJobStatus(jobId);
        return job is null
            ? Problem(title: "Job non trouvé", detail: $"Job {jobId} introuvable", statusCode: 404)
            : Ok(job);
    }
}
