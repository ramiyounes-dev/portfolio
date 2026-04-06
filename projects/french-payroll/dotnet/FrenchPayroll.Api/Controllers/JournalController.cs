using FrenchPayroll.Api.Services;
using FrenchPayroll.Core.Journal;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/journal")]
public sealed class JournalController : ControllerBase
{
    private readonly PayrollDataService _data;

    public JournalController(PayrollDataService data) => _data = data;

    [HttpGet("{periode:int}")]
    public IActionResult GetByPeriode(int periode)
    {
        var entries = _data.GetJournalEntries(periode);
        var (totalDebit, totalCredit, isBalanced) = PcgJournalFormatter.CheckBalance(entries);

        return Ok(new
        {
            entries,
            totalDebit,
            totalCredit,
            isBalanced
        });
    }
}
