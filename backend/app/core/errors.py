from typing import Optional, Dict, Any

class LARAError(Exception):
    """Base class for all LARA domain and runtime exceptions."""
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class AuthenticationError(LARAError):
    def __init__(self, message: str = "Authentication required", code: str = "AUTHENTICATION_REQUIRED"):
        super().__init__(message=message, code=code, status_code=401)

class PolicyDeniedError(LARAError):
    def __init__(self, message: str = "Access denied by policy", code: str = "POLICY_DENIED", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code=code, status_code=403, details=details)

class NotFoundError(LARAError):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND"):
        super().__init__(message=message, code=code, status_code=404)

class ConflictError(LARAError):
    def __init__(self, message: str = "Conflict with current resource state", code: str = "STATE_CONFLICT"):
        super().__init__(message=message, code=code, status_code=409)

class ValidationError(LARAError):
    def __init__(self, message: str = "Validation failed", code: str = "VALIDATION_FAILED", details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code=code, status_code=422, details=details)

class SandboxError(LARAError):
    def __init__(self, message: str = "Sandbox execution error", code: str = "SANDBOX_ERROR", status_code: int = 502, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, code=code, status_code=status_code, details=details)

class SandboxUnavailableError(SandboxError):
    def __init__(self, message: str = "Sandbox service unavailable", code: str = "SANDBOX_UNAVAILABLE"):
        super().__init__(message=message, code=code, status_code=503)

class SandboxTimeoutError(SandboxError):
    def __init__(self, message: str = "Sandbox execution timed out", code: str = "SANDBOX_TIMEOUT"):
        super().__init__(message=message, code=code, status_code=504)
