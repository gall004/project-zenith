# BDD Task Breakdown: Phase 4 GECX Agent Updates

## Phase 4: GECX Agent - Tool & Prompt Updates

### Deletions
- [x] Delete `gecx_agent/definitions/tools/request_visual_context.yaml` (OpenAPI webhook tool)

### Prompt Refactoring
- [x] Update `gecx_agent/definitions/prompts/gecx_vision_agent.xml` (Remove webhook token/pipeline references, use Client Function Tool)
- [x] Update `gecx_agent/definitions/prompts/gecx_sentiment_agent.xml` (Remove webhook token/pipeline references, use Client Function Tool)
- [x] Update any other relevant agent prompts that reference `request_visual_context`
