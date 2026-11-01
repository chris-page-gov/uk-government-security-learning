---
type: Local teaching
title: How can we express governance as code?
description: GovS 005 calls for defined authority limits, decision-making rules and
  accountabilities. As a local design response, selected rules can be represented
  in a versioned policy and checked before a simulated action.
status: draft
generated:
  by: process:public-security-learning/1
  at: '2026-10-31T23:49:00Z'
---

# How can we express governance as code?

## Translate selected decisions into checks

**local-analysis**

GovS 005 calls for defined authority limits, decision-making rules and accountabilities. As a local design response, selected rules can be represented in a versioned policy and checked before a simulated action.

Evidence: [GOVS005-AUTHORITY](../evidence/GOVS005-AUTHORITY.md).

## Keep the reasoning and the evidence

**local-analysis**

Record the rule version, input context, decision, failed conditions, source basis and human approvals. Auditability requires traceability across the lifecycle; passing a code check alone is not evidence that every governance obligation is met.

Evidence: [AI-AUDITABILITY](../evidence/AI-AUDITABILITY.md), [GOVS005-AI-LIFECYCLE](../evidence/GOVS005-AI-LIFECYCLE.md).

## Try a bounded example

**synthetic-example**

This site's policy playground checks purpose, action, resource, expiry, revocation, demo budget, disclosure, approval and audit conditions. It performs no real action and is not a production policy enforcement service.

Evidence: [GOVS005-AUTHORITY](../evidence/GOVS005-AUTHORITY.md), [AGENT-OVERSIGHT](../evidence/AGENT-OVERSIGHT.md).

## Directions for next work

- Agree which rules can be automated and which need judgement.
- Version policies and test both allow and deny cases.
- Link each local rule to its approved authority and evidence.

## What this does not establish

- The example policy is not an approved government schema, legal opinion or compliance certificate.

