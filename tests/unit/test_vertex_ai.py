import pytest
import json
from unittest.mock import MagicMock
from backend.app.adapters.vertex_ai import VertexAIGeminiAdapter, MockVertexAIAdapter

def test_mock_vertex_adapter_deterministic_responses():
    """Verify deterministic mock adapter returns structured JSON without GCP credentials."""
    mock_adapter = MockVertexAIAdapter()
    pytest.importorskip("asyncio")
    import asyncio

    res_research = asyncio.run(mock_adapter.generate_structured("Research Agent v1", "test pump cavitation"))
    assert "evidence" in res_research
    assert len(res_research["evidence"]) > 0

    res_verification = asyncio.run(mock_adapter.generate_structured("Verification Agent v1", "test check"))
    assert res_verification["verification_status"] == "PASSED"

def test_vertex_adapter_valid_structured_output():
    """Verify VertexAIGeminiAdapter passes GenerateContentConfig and parses valid JSON."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps({"agent": "research", "status": "COMPLETED", "score": 0.99})
    mock_client.models.generate_content.return_value = mock_response

    adapter = VertexAIGeminiAdapter(
        project="test-project",
        location="global",
        model_id="gemini-3.8-flash",
        client=mock_client
    )

    import asyncio
    schema = {
        "type": "object",
        "properties": {
            "agent": {"type": "string"},
            "status": {"type": "string"},
            "score": {"type": "number"}
        },
        "required": ["agent", "status"]
    }
    result = asyncio.run(adapter.generate_structured(
        system_prompt="System instructions",
        user_prompt="Analyze this evidence",
        schema=schema
    ))

    assert result["agent"] == "research"
    assert result["status"] == "COMPLETED"
    assert result["score"] == 0.99

    # Verify generate_content arguments
    assert mock_client.models.generate_content.called
    call_kwargs = mock_client.models.generate_content.call_args.kwargs
    assert call_kwargs["model"] == "gemini-3.8-flash"
    assert call_kwargs["contents"] == "Analyze this evidence"

    config = call_kwargs["config"]
    # Verify temperature parameter is omitted to keep default 1.0 reasoning configuration
    assert not hasattr(config, "temperature") or config.temperature is None
    assert config.response_mime_type == "application/json"
    assert config.response_schema == schema

def test_vertex_adapter_valid_output_without_schema():
    """Verify VertexAIGeminiAdapter handles calls without an explicit schema."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps({"summary": "Root cause identified"})
    mock_client.models.generate_content.return_value = mock_response

    adapter = VertexAIGeminiAdapter(
        project="test-project",
        location="global",
        model_id="gemini-3.8-flash",
        client=mock_client
    )

    import asyncio
    result = asyncio.run(adapter.generate_structured(
        system_prompt="Analyze",
        user_prompt="Provide summary"
    ))

    assert result["summary"] == "Root cause identified"
    config = mock_client.models.generate_content.call_args.kwargs["config"]
    assert config.response_schema is None

def test_vertex_adapter_rejects_malformed_json():
    """Verify VertexAIGeminiAdapter raises ValueError when model returns invalid JSON syntax."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is plain prose, not valid JSON { broken"
    mock_client.models.generate_content.return_value = mock_response

    adapter = VertexAIGeminiAdapter(
        project="test-project",
        location="global",
        model_id="gemini-3.8-flash",
        client=mock_client
    )

    import asyncio
    with pytest.raises(ValueError, match="Malformed JSON response from Vertex AI model"):
        asyncio.run(adapter.generate_structured("sys", "usr"))

def test_vertex_adapter_rejects_empty_response():
    """Verify VertexAIGeminiAdapter raises ValueError when model returns an empty text payload."""
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = ""
    mock_client.models.generate_content.return_value = mock_response

    adapter = VertexAIGeminiAdapter(
        project="test-project",
        location="global",
        model_id="gemini-3.8-flash",
        client=mock_client
    )

    import asyncio
    with pytest.raises(ValueError, match="Empty response received from Vertex AI model"):
        asyncio.run(adapter.generate_structured("sys", "usr"))

def test_vertex_adapter_propagates_provider_errors():
    """Verify VertexAIGeminiAdapter re-raises provider / API network exceptions."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError("Vertex AI API 503 Service Unavailable")

    adapter = VertexAIGeminiAdapter(
        project="test-project",
        location="global",
        model_id="gemini-3.8-flash",
        client=mock_client
    )

    import asyncio
    with pytest.raises(RuntimeError, match="503 Service Unavailable"):
        asyncio.run(adapter.generate_structured("sys", "usr"))
