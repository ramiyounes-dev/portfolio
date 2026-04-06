using FrenchPayroll.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace FrenchPayroll.Api.Controllers;

[ApiController]
[Route("api/rapport")]
public sealed class RapportController : ControllerBase
{
    private readonly PayrollDataService _data;

    public RapportController(PayrollDataService data) => _data = data;

    [HttpGet("masse-salariale")]
    public IActionResult Get() => Ok(_data.GetRapportMasse());
}
