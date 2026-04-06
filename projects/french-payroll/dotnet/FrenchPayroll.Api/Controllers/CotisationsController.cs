using FrenchPayroll.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/cotisations")]
public sealed class CotisationsController : ControllerBase
{
    private readonly PayrollDataService _data;

    public CotisationsController(PayrollDataService data) => _data = data;

    [HttpGet("{periode:int}")]
    public IActionResult GetByPeriode(int periode) => Ok(_data.GetCotisations(periode));
}
