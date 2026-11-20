import pytest
import os

pytestmark = pytest.mark.skipif(
    os.environ.get("LARA_RUN_REAL_SANDBOX_TESTS") != "true",
    reason="Requires live hardened GCE VM running goboxd with nsjail/cgroups/network isolation"
)

@pytest.mark.asyncio
async def test_live_vm_goboxd_execution():
    from backend.app.adapters.goboxd import GoboxdClient
    client = GoboxdClient()
    info = await client.get_info()
    assert info["nsjail"]["version"] != ""
    assert len(info["languages"]) > 0

@pytest.mark.asyncio
async def test_live_vm_nsjail_network_isolation_blocked():
    """Verify that untrusted python code cannot make outbound network requests inside nsjail."""
    from backend.app.adapters.goboxd import GoboxdClient
    client = GoboxdClient()
    payload = {
        "language": "py3",
        "source": "import urllib.request; urllib.request.urlopen('https://google.com', timeout=2)",
        "tests": [{"stdin": "", "expected_stdout": ""}]
    }
    res = await client.execute_run(payload)
    # The execution should fail inside jail due to lack of network namespace / loopback only
    assert res["status"] in ["runtime_error", "time_exceeded"]
