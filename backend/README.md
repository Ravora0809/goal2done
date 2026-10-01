# Goal2Done — REAL generate_document fix

The planner is already producing `generate_document` correctly. The running backend was still using the older root `tools.py`, `executor.py`, and `verifier.py`.

The old `executor.py` did **not** dispatch `generate_document`, and the old `verifier.py` had **no verifier** for it. That is why the API returned the verification failure message.

Replace:
- `tools.py`
- `executor.py`
- `verifier.py`

Add:
- `document_tools.py`

This patch creates a real DOCX using only the Python standard library and verifies the actual DOCX package before returning success.

Stop the old Uvicorn process before replacing files, then start it again.
