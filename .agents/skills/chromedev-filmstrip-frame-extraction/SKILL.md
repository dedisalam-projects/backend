---
name: chromedev-filmstrip-frame-extraction
description: "Use when visually verifying page load behavior frame-by-frame, or when detecting FOUC, splash screen timing, or hydration transition gaps — extract filmstrip frames from Chrome DevTools performance traces using Python and document visual state transitions."
tier: local
target-stacks: ["angular", "chrome-devtools", "mcp", "python"]
metadata:
  origin: auto-extracted
---

# Chrome DevTools MCP — Filmstrip Frame Extraction

**Extracted:** 2026-09-15
**Context:** Visually verifying that page load transitions (splash screen → content render) are smooth, without FOUC or layout shifts, by extracting every frame from a Chrome DevTools performance trace.

## Problem

Screenshots and DOM snapshots capture a single point in time. To verify smooth loading transitions (splash → hydration → rendered content), you need a **frame-by-frame filmstrip** showing every visual state change during page load. Manual DevTools filmstrip inspection is tedious and non-reproducible.

## Solution

### Step 1 — Capture a Performance Trace with Screenshots

Use Chrome DevTools MCP to capture a performance trace that includes screenshot frames:

```json
{
  "ServerName": "chromedev",
  "ToolName": "performance_start_trace",
  "Arguments": {
    "pageId": 1,
    "reload": true,
    "autoStop": true
  }
}
```

> The trace JSON file contains `Screenshot` events with base64-encoded frame images at each visual state change.

For throttled network testing (e.g., 3G), apply emulation before tracing:

```json
{
  "ServerName": "chromedev",
  "ToolName": "emulate",
  "Arguments": {
    "pageId": 1,
    "preset": "Slow 3G"
  }
}
```

### Step 2 — Extract All Frames from the Trace JSON

Use a Python scratch script to decode every `Screenshot` event into individual JPEG files:

```python
import json, base64, os

trace_path = "path/to/trace.json"
frames_dir = "path/to/output/frames"
os.makedirs(frames_dir, exist_ok=True)

with open(trace_path, "r", encoding="utf-8") as f:
    data = json.load(f)

events = data.get("traceEvents", data) if isinstance(data, dict) else data
screenshots = [e for e in events if e.get("name") == "Screenshot"]
screenshots.sort(key=lambda x: x["ts"])

start_ts = screenshots[0]["ts"] if screenshots else 0

for i, s in enumerate(screenshots):
    ts = s["ts"]
    rel_ms = int((ts - start_ts) / 1000)
    b64 = s.get("args", {}).get("snapshot", "")
    img_data = base64.b64decode(b64)
    fname = f"frame_{i:03d}_{rel_ms}ms.jpg"
    with open(os.path.join(frames_dir, fname), "wb") as out:
        out.write(img_data)

print(f"Extracted {len(screenshots)} frames")
```

### Step 3 — Identify Visual State Transitions (Deduplication)

Not every frame is unique. Use content hashing to find only the frames where the visual state actually changed:

```python
import hashlib

prev_hash = None
transitions = []

for i, s in enumerate(screenshots):
    ts = s["ts"]
    rel_ms = round((ts - start_ts) / 1000.0, 2)
    b64 = s.get("args", {}).get("snapshot", "")
    img_hash = hashlib.md5(b64.encode("utf-8")).hexdigest()

    if img_hash != prev_hash:
        transitions.append({
            "frame_index": i,
            "rel_ms": rel_ms,
            "hash": img_hash[:8],
        })
        prev_hash = img_hash

print(f"Total visual transitions: {len(transitions)}")
for t in transitions:
    print(f"Frame #{t['frame_index']:03d} at {t['rel_ms']:>8.2f} ms")
```

### Step 4 — Document Key Frames in a Carousel Artifact

Copy the transition frames to the artifact directory and create a markdown carousel for visual review:

````markdown
````carousel
![Frame 043: First Paint - Splash Screen](path/to/key_frame_043.jpg)
<!-- slide -->
![Frame 060: Spinner Animation Active](path/to/key_frame_060.jpg)
<!-- slide -->
![Frame 120: SSR Response Received](path/to/key_frame_120.jpg)
<!-- slide -->
![Frame 165: Fully Hydrated and Interactive](path/to/key_frame_165.jpg)
````
````

## Expected Output

| Frame | Visual State | What to Verify |
|-------|-------------|----------------|
| First unique frame | Splash screen spinner | Font renders correctly (no Times New Roman fallback) |
| Mid-sequence frames | Spinner animation | Smooth CSS animation, no layout shift |
| Transition frame | Blank or clean background | No raw HTML flash during navigation |
| Pre-hydration frame | Component outlines appearing | Card/layout structure without unstyled text |
| Final frame | Fully hydrated content | All styles applied, form interactive |

## When to Use

- After implementing splash screen or loading state changes
- When verifying FOUC elimination on slow networks (3G throttled)
- When auditing redirect transitions between micro-frontends
- When comparing before/after filmstrips for visual regression
- When Lighthouse CLS score needs frame-level root-cause analysis

## Related Skills

- `chromedev-first-load-html-inspection` — for DOM/screenshot inspection at a single point in time
- `chromedev-network-analysis` — for network request timing and performance trace insights
- `angular-ssr-protected-routes` — for the Hybrid CSR pattern that this technique validates
- `lighthouse-agentic-browsing-cls` — for CLS optimization that filmstrip analysis helps diagnose
