---
description: Create viral-ready product marketing videos from a single idea or image. Runs the full brandly pipeline — trend research, concept, script, asset generation, audio, validation, and publishing.
agent: director
subtask: true
---

# Brandly: $ARGUMENTS

## Brandly Product Video Pipeline

### 1. Analyze Image (optional but recommended)
If the user provided a product image, call `brandly_analyze_image(imagePath=..., context=...)` to extract forensic-level detail (subject, colors, lighting, style, creative direction).

### 2. Start Project
Call `brandly_start` with:
- `idea` — Product description from $ARGUMENTS
- `productName` — Short product name (ask user if not clear)
- `targetPlatforms` — e.g. ["tiktok", "instagram", "youtube"]
- `budgetCredits` — Default 300 unless user specifies
- Optional: `imagePath` if an image was provided and analyzed

Save the returned `projectID`.

### 3. Run the Pipeline
Loop through phases in order: `trends → concept → script → asset → audio → validate → publish`

For each phase:
1. Call `brandly_run_project(projectID=...)` → returns dispatch instructions with agent prompt
2. Dispatch the subagent via the `task` tool using the prompt from dispatch
3. Wait for subagent to complete
4. Call `brandly_approve(projectID=..., phase="<phase>")` to advance
5. Repeat until phase is "done"

### 4. Cost Management
- Before expensive operations, check `brandly_status(projectID=...)` for remaining budget
- If budget is low, warn the user
- Use `brandly_estimate` before starting if user wants a cost preview

### 5. Re-editing (if needed)
If validation score is low, use `brandly_re_edit(projectID=..., shotId=..., newPrompt=...)` then re-run asset phase.

### 6. Memory
Use `brandly_memory` to save/recall user preferences across projects.

### 7. Provide Summary
When pipeline completes, show:
- Final video location
- Total credits spent
- Virality score
- Platform-specific publish recommendations
