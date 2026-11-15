#!/usr/bin/env python3
"""Fail closed on the exact already-assured public publication directory."""

import hashlib
import json
import sys
from pathlib import Path


def verify(root, expected_source=None, expected_manifest=None):
    root = Path(root).resolve()
    raw = (root / "site-manifest.json").read_bytes()
    manifest = json.loads(raw)
    rows = manifest["files"]
    if manifest["schema"] != "security-learning-public-site-manifest.v1":
        raise ValueError("Unknown public artifact manifest")
    if expected_manifest and hashlib.sha256(raw).hexdigest() != expected_manifest:
        raise ValueError("Public manifest identity differs")
    names = []
    for row in rows:
        name = row["path"]
        path = root / name
        if Path(name).is_absolute() or "\\" in name or any(p in {"", ".", "..", "private", "protected-evidence", "intake", ".git", "node_modules"} for p in name.split("/")) or not path.resolve().is_relative_to(root) or any(p.is_symlink() for p in [path, *path.parents] if p.is_relative_to(root)):
            raise ValueError("Unsafe public artifact member")
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != row["sha256"] or len(data) != row["bytes"]:
            raise ValueError("Public artifact digest differs: " + name)
        if name.endswith((".docx", ".pdf", ".env")):
            raise ValueError("Raw document or account file in public artifact")
        names.append(name)
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}
    if len(names) != len(set(names)) or actual != set(names) | {"site-manifest.json"}:
        raise ValueError("Unapproved or missing public artifact member")
    release = json.loads((root / "release.json").read_text())
    if release["source_input_state"] != "verified-commit":
        raise ValueError("Only an assured committed source tree may be promoted")
    if release["source_commit"] != manifest["source_commit"] or expected_source and release["source_commit"] != expected_source:
        raise ValueError("Assured source commit differs")
    digest = hashlib.sha256((root / "okf/okf-bundle.json").read_bytes()).hexdigest()
    if digest != release["public_bundle_sha256"]:
        raise ValueError("Public bundle identity differs")
    capture = json.loads((root / "walkthrough/capture.json").read_text())
    keys = ["interface_sha256", "snapshot_id", "public_bundle_sha256"]
    if any(capture["release"][key] != release[key] for key in keys):
        # Edition 1.1.0 deliberately preserves the original illustrated capture.
        # The exact public profile binds all three historical identities, while
        # the current graph/snapshot must remain unchanged. No image is relabelled.
        profile_bytes = (root / "supplements/ai-and-architecture/profile.json").read_bytes()
        profile = json.loads(profile_bytes)
        supplement = release.get("supplement", {})
        if release.get("edition") != "1.1.0" or supplement.get("version") != "1.1.0" or supplement.get("tool_indexed") is not False or supplement.get("profile_sha256") != hashlib.sha256(profile_bytes).hexdigest():
            raise ValueError("Historical walkthrough has no exact approved companion binding")
        if profile.get("version") != "1.1.0" or profile.get("expected_scope", {}).get("tool_indexed") is not False or any(capture["release"][key] != profile.get("historical_walkthrough", {}).get(key) for key in keys):
            raise ValueError("Historical walkthrough identity differs from the reviewed profile")
        if any(capture["release"][key] != release[key] for key in ["snapshot_id", "public_bundle_sha256"]):
            raise ValueError("Historical walkthrough graph no longer matches")
    return {"status": "passed", "source_commit": release["source_commit"], "site_manifest_sha256": hashlib.sha256(raw).hexdigest(), "public_bundle_sha256": digest, "snapshot_id": release["snapshot_id"], "files": len(actual), "private_source_bodies": 0}


if __name__ == "__main__":
    promotion = Path("promotion.json")
    if not promotion.is_file():
        raise ValueError("Exact-byte promotion evidence is required")
    evidence = json.loads(promotion.read_text())
    print(json.dumps(verify(sys.argv[1] if len(sys.argv) > 1 else "site", evidence.get("source_commit"), evidence.get("site_manifest_sha256"))))
