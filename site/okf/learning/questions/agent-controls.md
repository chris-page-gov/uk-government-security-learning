---
type: Local teaching
title: What should govern an agent that can use government APIs?
description: Define the intended benefit, owner, authority limits, decision rights,
  human oversight and escalation route. GovS 005 brings these into governance and
  AI planning; the AI Playbook describes a chain of human responsibility.
status: draft
generated:
  by: process:public-security-learning/1
  at: '2026-10-31T23:49:00Z'
---

# What should govern an agent that can use government APIs?

## Start with an accountable purpose

**source-guidance**

Define the intended benefit, owner, authority limits, decision rights, human oversight and escalation route. GovS 005 brings these into governance and AI planning; the AI Playbook describes a chain of human responsibility.

Evidence: [GOVS005-AUTHORITY](../evidence/GOVS005-AUTHORITY.md), [GOVS005-AI-LIFECYCLE](../evidence/GOVS005-AI-LIFECYCLE.md), [AI-ACCOUNTABILITY](../evidence/AI-ACCOUNTABILITY.md).

## Bound both access and behaviour

**source-guidance**

Check API authorisation on every request and constrain the agent's goals and access. NCSC guidance calls for technical and operational controls alongside prompts.

Evidence: [API-SCOPES](../evidence/API-SCOPES.md), [AGENT-BOUNDARIES](../evidence/AGENT-BOUNDARIES.md).

## Make the whole task reviewable

**local-analysis**

A useful local design is a task record binding purpose, allowed actions and resources, expiry, approval conditions, monitoring and stopping rules to a policy version. This is a proposed implementation pattern, not a government-mandated schema.

Evidence: [GOVS005-AUTHORITY](../evidence/GOVS005-AUTHORITY.md), [AI-AUDITABILITY](../evidence/AI-AUDITABILITY.md), [AGENT-OVERSIGHT](../evidence/AGENT-OVERSIGHT.md).

## Directions for next work

- Identify who may approve the task and its limits.
- List the API scopes and the additional task decisions they do not settle.
- Test expiry, revocation, out-of-scope actions and missing evidence.

## What this does not establish

- The public sources do not identify the approver or risk tolerance for your organisation.

