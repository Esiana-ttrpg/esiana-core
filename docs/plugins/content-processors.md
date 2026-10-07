# Content processors (future)

Esiana may later expose a generic **content processor** plugin seam for annotate/analyze/transform/generate purposes (`content:process` vs `content:process-external`). Processors receive structured content already filtered by Esiana permissions and return data annotations only—never HTML/UI or direct writes.

Session Multi-View aggregation is a **core deterministic** feature and does not call this seam. When a real consumer arrives (grammar, style, local/hosted model enrichment), register processors there and optionally merge `purpose: "session-note-topics"` annotations into the aggregate projection. Until then, no unused registry ships in core.
