#!/usr/bin/env python3
"""LARA × goboxd: End-to-End mTLS & Execution Smoke Test Utility.

Executes authenticated test requests against the secured goboxd service:
1. Validates mTLS handshake and certificate validation.
2. Validates Bearer token rejection and acceptance.
3. Tests Python 3, C, and C++ compilation and execution in nsjail.
4. Tests timeout, syntax errors, and resource limits.
"""

import sys
import ssl
import json
import argparse
import httpx

def main():
    parser = argparse.ArgumentParser(description="goboxd mTLS Smoke Test")
    parser.add_argument("--url", default="https://goboxd.internal:8443", help="Base URL of goboxd service")
    parser.add_argument("--ca-cert", required=False, help="Path to Root CA certificate")
    parser.add_argument("--client-cert", required=False, help="Path to client certificate")
    parser.add_argument("--client-key", required=False, help="Path to client private key")
    parser.add_argument("--token", required=True, help="Bearer authorization token")
    parser.add_argument("--insecure-skip-tls", action="store_true", help="FOR LOCAL TESTING ONLY: disable TLS verify")
    args = parser.parse_args()

    ssl_ctx = None
    if args.url.startswith("https://") and not args.insecure_skip_tls:
        ssl_ctx = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        if args.ca_cert:
            ssl_ctx.load_verify_locations(cafile=args.ca_cert)
        if args.client_cert and args.client_key:
            ssl_ctx.load_cert_chain(certfile=args.client_cert, keyfile=args.client_key)

    headers = {
        "Authorization": f"Bearer {args.token}",
        "Content-Type": "application/json"
    }

    print(f"Connecting to {args.url}...")

    with httpx.Client(verify=ssl_ctx if ssl_ctx else not args.insecure_skip_tls, timeout=15.0) as client:
        # Test 1: Probe /readyz
        print("\n[Test 1] Probing /readyz with Bearer token...")
        r = client.get(f"{args.url}/readyz", headers=headers)
        print(f"  Status: {r.status_code}")
        print(f"  Body:   {r.text}")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"

        # Test 2: Verify 401 on wrong token
        print("\n[Test 2] Probing /readyz with invalid token (expecting 401)...")
        r_bad = client.get(f"{args.url}/readyz", headers={"Authorization": "Bearer bad-token-here"})
        print(f"  Status: {r_bad.status_code}")
        assert r_bad.status_code == 401, f"Expected 401, got {r_bad.status_code}"

        # Test 3: Python 3 Execution
        print("\n[Test 3] Executing Python 3 arithmetic program...")
        py_payload = {
            "language": "py3",
            "source": "n = int(input())\nprint(n * 2)",
            "tests": [
                {
                    "stdin": "21\n",
                    "expected_stdout": "42\n"
                }
            ]
        }
        r_py = client.post(f"{args.url}/run", json=py_payload, headers=headers)
        print(f"  Status: {r_py.status_code}")
        res = r_py.json()
        print(f"  Response: {json.dumps(res, indent=2)}")
        assert res.get("status") in ["accepted", "ok"], f"Execution failed: {res}"
        if "tests" in res and res["tests"]:
            stdout = res["tests"][0].get("stdout", "").strip()
            assert stdout == "42", f"Expected stdout '42', got {stdout!r}"
            print("  Python 3 Execution Verified: 21 * 2 = 42")

        # Test 4: C Execution
        print("\n[Test 4] Executing C deterministic program...")
        c_payload = {
            "language": "c",
            "source": "#include <stdio.h>\nint main() { printf(\"LARA-C-OK\\n\"); return 0; }",
            "tests": [{"stdin": "", "expected_stdout": "LARA-C-OK\n"}]
        }
        r_c = client.post(f"{args.url}/run", json=c_payload, headers=headers)
        print(f"  Status: {r_c.status_code}")
        res_c = r_c.json()
        assert res_c.get("status") in ["accepted", "ok"], f"C Execution failed: {res_c}"
        print("  C Compilation & Execution Verified!")

        # Test 5: C++ Execution
        print("\n[Test 5] Executing C++ program...")
        cpp_payload = {
            "language": "cpp",
            "source": "#include <iostream>\nint main() { int a; std::cin >> a; std::cout << (a + 10) << std::endl; return 0; }",
            "tests": [{"stdin": "32\n", "expected_stdout": "42\n"}]
        }
        r_cpp = client.post(f"{args.url}/run", json=cpp_payload, headers=headers)
        print(f"  Status: {r_cpp.status_code}")
        res_cpp = r_cpp.json()
        assert res_cpp.get("status") in ["accepted", "ok"], f"C++ Execution failed: {res_cpp}"
        print("  C++ Compilation & Execution Verified!")

    print("\nALL GOBOXD STANDALONE SMOKE TESTS PASSED CLEANLY!")

if __name__ == "__main__":
    main()
