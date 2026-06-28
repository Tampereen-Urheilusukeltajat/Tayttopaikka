---
name: "PR Description"
description: Generate a pull request title and description for the current branch
category: Workflow
tags: [git, pr, github]
---

Generate a pull request title and description for the current branch.

**Steps**

1. Run `git log main..HEAD --oneline` and `git diff main...HEAD -- . ':(exclude)openspec/'` to understand what changed. Read any relevant source files if the diff alone is not enough to understand the business impact.

2. Write a **title**: one compact phrase describing what changes at the feature/behaviour level. No "feat:", no prefixes. Just plain English. Max ~60 characters.

3. Write a **description** with exactly these sections:

   **AI Overview** — a single paragraph, maximum three short sentences. What this PR does and why, from a product perspective. No implementation details here.

   **Business changes** — bullet list. What does a user or admin experience differently? Think: new flows, new notifications, changed behaviour, new access rules. Skip anything that is purely internal.

   **Technical changes** — bullet list of the most relevant implementation decisions. Omit:
   - Test file additions or modifications (unless the testing approach itself is a notable decision)
   - New types or modifications to existing types (unless the type is a significant public contract change)
   - Minor plumbing (imports, re-exports, small helpers)

   Focus on: new modules, architectural decisions, significant query/service additions, changes to shared infrastructure (scheduler, email, auth, etc.), and anything a reviewer should pay close attention to.

4. Output in two separate fenced code blocks so each part is independently copyable:
   - First block: the title only (plain text fence)
   - Second block: the description only (markdown fence)
