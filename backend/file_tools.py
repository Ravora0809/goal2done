"""Safe local file/document discovery tools for Goal2Done."""
import os
from pathlib import Path

BASE_DIR = Path(os.getenv("GOAL2DONE_FILES_DIR", Path.cwd() / "workspace")).resolve()
MAX_READ_CHARS = int(os.getenv("GOAL2DONE_MAX_READ_CHARS", "50000"))


def _safe_path(path: str) -> Path:
    candidate = (BASE_DIR / path).resolve()
    if candidate != BASE_DIR and BASE_DIR not in candidate.parents:
        raise ValueError("Path is outside the Goal2Done workspace")
    return candidate


def list_files(directory: str = ".", max_results: int = 50):
    try:
        root = _safe_path(directory)
        if not root.exists() or not root.is_dir():
            return {"status": "error", "type": "files", "message": "Directory not found"}
        files = []
        for p in root.rglob("*"):
            if p.is_file():
                files.append({
                    "path": str(p.relative_to(BASE_DIR)),
                    "name": p.name,
                    "size": p.stat().st_size,
                })
                if len(files) >= max_results:
                    break
        return {"status": "success", "type": "files", "files": files, "count": len(files), "root": str(BASE_DIR)}
    except Exception as exc:
        return {"status": "error", "type": "files", "message": str(exc)}


def search_files(query: str, directory: str = ".", max_results: int = 20):
    try:
        root = _safe_path(directory)
        q = query.lower().strip()
        matches = []
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            if q in p.name.lower():
                matches.append({"path": str(p.relative_to(BASE_DIR)), "name": p.name, "size": p.stat().st_size})
                if len(matches) >= max_results:
                    break
        return {"status": "success", "type": "file_search", "query": query, "files": matches, "count": len(matches)}
    except Exception as exc:
        return {"status": "error", "type": "file_search", "message": str(exc)}


def read_file(path: str, max_chars: int = MAX_READ_CHARS):
    try:
        p = _safe_path(path)
        if not p.exists() or not p.is_file():
            return {"status": "error", "type": "file", "message": "File not found"}
        data = p.read_text(encoding="utf-8", errors="replace")
        truncated = len(data) > max_chars
        return {
            "status": "success",
            "type": "file",
            "path": str(p.relative_to(BASE_DIR)),
            "content": data[:max_chars],
            "truncated": truncated,
        }
    except UnicodeDecodeError:
        return {"status": "error", "type": "file", "message": "Binary file cannot be read as text"}
    except Exception as exc:
        return {"status": "error", "type": "file", "message": str(exc)}
