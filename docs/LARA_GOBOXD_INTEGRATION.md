# LARA × goboxd: End-to-End Technical Integration Reference

**Document Version:** 1.0.0
**Status:** Integrated & Verified
**Date:** 2026-11-21
**Authors:** LARA Engineering & goboxd Integration Team

---

## 1. Executive Summary & Repositories

LARA (Lattice Agentic Runtime Accelerator) integrates with **goboxd** as an out-of-process, isolated code-execution provider. Untrusted code generated during incident investigations (e.g., automated forensic scripts, data transformation routines) is executed securely inside an nsjail sandbox on a dedicated Google Compute Engine (GCE) Linux VM, with no access to Google Cloud production data, databases, or service credentials.

### Repository Architecture & Pinned Revisions

| Repository | Role | Upstream Base / Branch | Pinned Commit SHA | Target Integration Branch |
| :--- | :--- | :--- | :--- | :--- |
| **LARA** (`Ashwath-Raj/LARA-Lattice-Agentic-Runtime-Accelerator-`) | Orchestrator, Frontend & API Runtime | `main` (`39b4a3773f43f2a2f777356b3549820fabca36dd`) | `efa932ecc0f2fa9c91e7a12f31ceaab45cc6f42e` | `integrate/lara-gcp-staging` |
| **goboxd** (`Praneeth0910/goboxd`) | Untrusted Code Sandbox Daemon | `team/sudo` | `2e8a10dfc6271f33e88571446f319a1c3a7f11da` | `feat/lara-authenticated-runtime` (`27043089b44b739d41f34cf22b8465d15f6b06cd`) |

### Licensing Boundary
- **goboxd License:** GNU General Public License v3.0 (GPL-3.0).
- **LARA License:** Independent application repository.
- **Isolation Policy:** LARA communicates with goboxd strictly across a network boundary via JSON over HTTPS. No goboxd source code is vendored or compiled into LARA. Both systems remain independently licensed and versioned.

---

## 2. goboxd Server-Side Implementation (`feat/lara-authenticated-runtime`)

### 2.1 Constant-Time Bearer Token Authentication
To eliminate timing attack vulnerabilities in token validation, goboxd implements server-side Bearer token middleware in Go:

- **Location:** `internal/middleware/auth.go`
- **Algorithm:** Cryptographic constant-time comparison via `crypto/subtle.ConstantTimeCompare`:
  ```go
  func Auth(expectedToken string) func(http.Handler) http.Handler {
      return func(next http.Handler) http.Handler {
          return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
              authHeader := r.Header.Get("Authorization")
              // Validate "Bearer <token>" scheme
              ...
              if subtle.ConstantTimeCompare([]byte(token), []byte(expectedToken)) != 1 {
                  respondUnauthorized(w, "Invalid authorization token")
                  return
              }
              next.ServeHTTP(w, r)
          })
      }
  }
  ```
- **Configuration & Startup Enforcement:** In `cmd/goboxd/main.go`, `GOBOXD_INTERNAL_AUTH_TOKEN` is read from environment. If the token is missing or shorter than 16 characters, daemon startup aborts immediately:
  ```go
  if len(authToken) < 16 {
      log.Fatalf("GOBOXD_INTERNAL_AUTH_TOKEN must be at least 16 characters long; got %d characters", len(authToken))
  }
  ```
- **Route Authorization Boundaries:**
  - `GET /healthz`: Publicly accessible liveness probe (no token required).
  - `GET /readyz`: Protected readiness probe (Bearer token required).
  - `GET /info`: Protected engine capabilities probe (Bearer token required).
  - `POST /run`: Protected execution endpoint (Bearer token required).

### 2.2 goboxd Test Verification Suite
Tested inside Linux/WSL with Go 1.23.6 and race detector enabled (`go test -race -count=1 ./internal/...`):
- `internal/middleware/auth_test.go`: Valid token, case-insensitive scheme, missing header, invalid scheme, empty token, wrong token, prefix collision, empty expected token.
- `internal/handler/auth_integration_test.go`: End-to-end HTTP integration tests verifying `/healthz` is open while `/readyz`, `/info`, and `/run` reject unauthenticated or incorrectly authenticated requests with 401 JSON.
- `internal/config`, `internal/handler`, `internal/runner`, `internal/validate`: All existing unit tests pass without regressions.

---

## 3. LARA Client-Side Implementation

### 3.1 `GoboxdClient` & mTLS Configuration (`backend/app/adapters/goboxd.py`)
LARA's `GoboxdClient` has been upgraded to support both mutual TLS (mTLS) certificate verification and strict Bearer token authentication:

- **mTLS SSL Context (`_get_ssl_context`)**:
  - Automatically loads Root CA certificate from `GOBOXD_TLS_CA_CERT_PATH`.
  - Automatically loads client certificate and private key from `GOBOXD_TLS_CLIENT_CERT_PATH` and `GOBOXD_TLS_CLIENT_KEY_PATH`.
  - Enforces TLS 1.2+ minimum protocol version.
- **Authorization Header Injection (`_get_auth_headers`)**:
  - Validates `GOBOXD_INTERNAL_AUTH_TOKEN` presence. Fails closed with `AUTH_TOKEN_MISSING` if unset.
  - Generates `Authorization: Bearer <TOKEN>`.
- **Response Handling & Truncation**:
  - Handles 401 Unauthorized (`SANDBOX_UNAUTHORIZED`), 403 Forbidden (`SANDBOX_FORBIDDEN`), 429 Rate Limited (`SANDBOX_RATE_LIMITED`), and 503 Unavailable (`SANDBOX_UNAVAILABLE`).
  - Enforces strict stdout/stderr truncation limits (512 KB) to prevent memory exhaustion.

### 3.2 Configuration Hardening (`backend/app/core/config.py`)
- **Default Kill-Switch:** `GOBOXD_KILL_SWITCH = True` (fail closed by default).
- **Production Validation:** If `APP_ENV=production` and `GOBOXD_KILL_SWITCH=False`:
  - `GOBOXD_BASE_URL` must begin with `https://`.
  - `GOBOXD_BASE_URL` cannot point to `localhost` or `127.0.0.1`.
  - `GOBOXD_INTERNAL_AUTH_TOKEN` must be at least 32 characters long.
  - `GOBOXD_TLS_CA_CERT_PATH` must point to an existing CA certificate file.

---

## 4. Deployment Packaging (`deploy/goboxd/`)

LARA provides a complete, turnkey deployment package under `deploy/goboxd/`:

1. **`docker-compose.yml`**:
   - Runs `goboxd` container published strictly on `127.0.0.1:8081:8080`.
   - Requires `--privileged` mode and cgroup v2 mount (`/sys/fs/cgroup:/sys/fs/cgroup:rw`) for nsjail.
2. **`nginx-mtls.conf`**:
   - Reverse proxy listening on port 8443 with TLS termination.
   - Requires client certificates (`ssl_verify_client on`).
   - Forwards to `http://127.0.0.1:8081`.
   - Strips authorization tokens and request bodies from NGINX access logs.
3. **`generate_certificates.sh`**:
   - Automates generation of 4096-bit RSA Root CA, Server Certificate (with SAN `goboxd.internal`, `127.0.0.1`), and Client Certificate.
4. **`setup_vm.sh`**:
   - Installs Docker, NGINX, and systemd units on Ubuntu 24.04 LTS.
   - Configures UFW firewall: blocks port 8080 and 8081; opens port 8443 only.
5. **`goboxd.service`**:
   - Systemd unit managing the Docker Compose lifecycle with automatic restart on failure.
6. **`smoke_test.py`**:
   - Automated end-to-end Python test verifying mTLS handshake, Bearer token, Python 3 arithmetic, C compilation, and C++ streaming.

---

## 5. Google Secret Manager Reconciliation

The 8 canonical secrets registered across LARA and goboxd:

| Secret Name | Cloud Run SA Access | GCE VM Access | Purpose |
| :--- | :---: | :---: | :--- |
| `lara-secret-key` | YES | NO | HMAC key for signing browser session cookies |
| `lara-goboxd-token` | YES | YES | Shared Bearer token for goboxd authentication |
| `lara-goboxd-ca` | YES | YES | Root CA certificate for mTLS verification |
| `lara-goboxd-client-cert` | YES | NO | Client certificate for Cloud Run mTLS |
| `lara-goboxd-client-key` | YES | NO | Client private key for Cloud Run mTLS |
| `lara-goboxd-server-cert` | NO | YES | Server certificate for GCE NGINX |
| `lara-goboxd-server-key` | NO | YES | Server private key for GCE NGINX |
| `lara-admin-initial-password` | YES (Bootstrapper) | NO | Salted PBKDF2 hash for initial admin user |

---

## 6. Acceptance & Verification Evidence

1. **Go Race Detector Tests (`goboxd`):**
   ```
   === RUN   TestAuthMiddleware_ValidToken
   --- PASS: TestAuthMiddleware_ValidToken (0.00s)
   === RUN   TestAuthMiddleware_InvalidToken
   --- PASS: TestAuthMiddleware_InvalidToken (0.00s)
   === RUN   TestAuth_HealthzEndpointOpenWithoutToken
   --- PASS: TestAuth_HealthzEndpointOpenWithoutToken (0.00s)
   === RUN   TestAuth_ReadyzRequiresValidToken
   --- PASS: TestAuth_ReadyzRequiresValidToken (0.00s)
   === RUN   TestAuth_RunRequiresValidToken
   --- PASS: TestAuth_RunRequiresValidToken (0.00s)
   PASS: all packages in ./internal/... passed with 0 data races.
   ```
2. **Python Client Unit Tests (`LARA`):**
   ```
   tests/unit/test_goboxd_client_mtls.py: 9 passed
   tests/unit/test_tool_gateway.py: 17 passed (including kill switch & fail closed)
   TOTAL Pytest Suite: 108 passed, 2 skipped
   ```
3. **Frontend Vitest Suite (`LARA`):**
   ```
   5 test files passed, 20 passed (100% pass rate)
   ```
4. **Frontend Production Build:**
   ```
   Built in 484ms, statically mounted at backend/app/static
   ```
