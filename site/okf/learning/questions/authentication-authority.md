---
type: Local teaching
title: Does an API token authorise the agent's whole task?
description: The API standards distinguish authentication from resource-level access
  control and require the relevant scope to be checked for each request. Token exchange
  supports a service acting on behalf of a user.
status: draft
generated:
  by: process:public-security-learning/1
  at: '2026-10-31T23:49:00Z'
---

# Does an API token authorise the agent's whole task?

## A token is one part of the decision

**source-guidance**

The API standards distinguish authentication from resource-level access control and require the relevant scope to be checked for each request. Token exchange supports a service acting on behalf of a user.

Evidence: [API-SCOPES](../evidence/API-SCOPES.md), [API-TOKEN-EXCHANGE](../evidence/API-TOKEN-EXCHANGE.md).

## Whole-task authority needs an explicit decision

**local-analysis**

Our analysis is that successful authentication or a valid API scope does not demonstrate approval for an entire multi-step objective, its resource use or its disclosures. Define those decisions separately and keep the task within the organisation's authority limits.

Evidence: [GOVS005-AUTHORITY](../evidence/GOVS005-AUTHORITY.md), [AGENT-BOUNDARIES](../evidence/AGENT-BOUNDARIES.md), [API-SCOPES](../evidence/API-SCOPES.md).

## Directions for next work

- Record the user or service identity and the delegation chain.
- Map each proposed action to both API scope and task authority.
- Check the permission again when context or policy changes.

## What this does not establish

- A token's actual claims and the receiving service's controls need separate technical verification.

