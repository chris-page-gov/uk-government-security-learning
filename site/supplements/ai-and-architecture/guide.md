# AI and architecture: from public guidance to a bounded service

Public learning supplement 1.1.0 · prepared 14 November 2026. Public sources were observed on 3 and 10 November 2026. Follow each publisher for its current wording. This is independent teaching, with no government endorsement or organisational adoption.

This companion extends the public site. The existing Ask the evidence tools still search the separately frozen ten-source, seventeen-passage learning graph. They do not search this supplement or its onward-reference catalogue. Protected documents, supplied presentation contents and private findings are not inputs to this guide.

## What the public sources establish

### A common architecture vocabulary

The [GDS Local Government Architecture Model](https://architecture.cddo.cabinetoffice.gov.uk/gds-local/) describes nine technology layers and is work in progress. The retained snapshot contains 86 entries and illustrative planning stacks. Those counts are local observations of that edition, not proof of a complete council estate. The [publication article](https://technology.blog.gov.uk/2026/04/14/publishing-a-common-architectural-model-for-local-government/) explains its intended shared description and local choice.

**Local assessment:** use the model to locate capabilities, dependencies, duplication and ownership questions. Add actual interfaces, information flows, security boundaries, lifecycle costs and acceptance evidence. A descriptive model does not itself supply testable obligations, procurement certification or measured benefits. Its illustrative planning stack does not establish applicability across every UK jurisdiction.

### Lifecycle AI risk management

DSIT's [AI Risk Management Toolkit: guidance](https://www.gov.uk/government/publications/ai-risk-management-toolkit/ai-risk-management-toolkit-guidance) covers identifying risks, likelihood/impact, ownership, treatment, monitoring and reporting. The [publication page](https://www.gov.uk/government/publications/ai-risk-management-toolkit) supplies Excel and ODS workbook formats. The guidance allows a suitable existing risk register rather than requiring a separate workbook. Its examples and prompts are starting points, not exhaustive controls or evidence that a service is safe.

**Local assessment:** retain risk scenarios, causes, affected people, treatment evidence, uncertainty and the actual residual-risk decision. A score needs justified inputs and agreed appetite. Keep a source-specific suggested governance role separate from locally appointed service, data, security and delivery responsibilities. The workbook formats and filename/displayed version markers need explicit identity; equivalent saved values do not prove native recalculation or operational effectiveness.

### Readiness, evaluation and agents

The [PSAI readiness checklist](https://gds-dtx.github.io/psai-tech/projects/ai-assurance-checklist/) is a self-complete aid. [E2VT](https://gds-dtx.github.io/psai-tech/projects/E2VT/) organises evaluation and indicative measures. The [reference operating model for agentic AI](https://gds-dtx.github.io/psai-tech/projects/agentic-ai-operating-model.html) was labelled working draft v0.4 for review in the observed edition. The [PSAI hub](https://gds-dtx.github.io/psai-tech/) contains resources at different stages.

**Local assessment:** combine these as review aids, with an agreed taxonomy and service-specific thresholds. Do not turn a draft, a self-completed checklist or a generic threshold into official acceptance. Define metrics with matching populations, units and time windows; test misleading or reversed formulae before operational use. Public readability did not establish a retrievable source commit or a reuse licence for the whole PSAI site, so this supplement links to the originals and uses short independent summaries.

### Open-weight models

[AISI's open-weight risk article](https://www.aisi.gov.uk/blog/managing-risks-from-increasingly-capable-open-weight-ai-systems) discusses risks and uncertain mitigations as capabilities increase. Released weights can be copied and modified, making recovery different from withdrawing an application endpoint.

**Local assessment:** record model/data licences, hashes, lineage, deployment choices and threat evidence. Keep application rollback separate from recall of distributed model copies. Filters, monitoring and a supplier model card do not by themselves prove control effectiveness.

## Strengths, gaps and relevance to engineering practice

The sources complement each other: architecture describes the service estate; the toolkit structures risk decisions; readiness and evaluation aids organise evidence; the agentic draft draws attention to actions and oversight; AISI adds a release and reversibility boundary. Their different purposes and authority must remain visible.

**Local proposals, pending adoption:**

1. Maintain one versioned assurance record for purpose, non-AI alternatives, accountable reviewers, source/model/data/tool versions, scenarios, treatment evidence, open gaps and decisions. Connect it to existing risk and change systems.
2. Bind promotion to the exact tested baseline. Evaluate the whole workflow as well as components, including adverse cases, affected groups, human fallback and material-change triggers. Record insufficient evidence separately from failure and success.
3. Enforce action contracts outside the model: trusted identity, least privilege, explicit parameters, approved confirmations, backend validation, stale-state checks, idempotency, revocation and uncertain-result reconciliation.
4. Establish operational readiness: useful outcome/error/drift/cost signals, proportionate protected logs, a tested pause route, incident ownership, accessible challenge and human fallback, retirement and rollback plans.

These are local engineering proposals. They map naturally to version control, build pipelines, automated testing, documented interfaces, secrets/data protection, infrastructure configuration, accessibility and observability. They are not an assertion that the cited publications adopted our particular controls, roles or fictional rules.

Check applicability against the [Service Standard](https://www.gov.uk/service-manual/service-standard) and [Technology Code of Practice](https://www.gov.uk/guidance/the-technology-code-of-practice) for the actual organisation and service. Public-sector relevance does not establish universal mandatory scope or statutory authority.

## Worked example: a library-loan assistant

This is a synthetic design. There is no real patron, council policy, model deployment, lending backend or production acceptance.

**Architecture:** place the resident/staff channel, catalogue and service directory, assistant, lending API, identity, records and monitoring in the architecture map. Give each interface an owner and show which information crosses each boundary. Record gaps rather than inventing an integration.

**Risk:** an assistant might disclose a patron's loans, renew the wrong item, misstate eligibility or produce an inaccessible refusal. Each scenario needs affected people, likelihood/impact rationale, treatment, an evidence owner and an unresolved or recorded residual-risk decision. The model's answer confidence is not the authority to act.

**Read-only discovery:** permit catalogue and public directory searches with bounded queries, provenance, observed dates and coverage caveats. [Open Referral UK](https://openreferraluk.org/) provides a service-information standard; data availability and conformance do not prove service suitability, current capacity or complete local coverage. Show the publisher's contact route for human checking. Do not automatically send personal information or create a referral.

**Lending action:** renewal is a separate authorised operation. The backend must check the authenticated patron, item, lending eligibility and current record version. Bind confirmation to the exact action and parameters. An ambiguous request, expired confirmation, changed record, missing authority or revoked permission must stop or escalate. A model-generated plan is untrusted input to this boundary.

**Repeated or uncertain requests:** use a durable operation identity and backend idempotency. A timeout may mean the action occurred; reconcile the result rather than blindly renewing again. A local demonstration of this rule is not a production concurrency implementation.

**Evidence before adoption:** test reading versus writing, wrong identity, stale records, prompt injection, inaccessible confirmation, revocation, duplicate requests, uncertain outcomes, directory gaps and human fallback. Retain the exact baseline and results. Appoint actual accountable reviewers and exercise incident handling. No generic checklist supplies those decisions.

## Onward references and capture limits

The linked [reference catalogue](references.json) retains every top-level acquisition observation from twelve public-source manifests: requested URL, parent URL witnesses where recorded, historical HTTP status and response digest. It includes failures and multiple representations. A response digest identifies a retained research representation; the body is not republished here. HTTP 200 may represent a login or interstitial. Counts are observations, not distinct standards or works.

Useful onward routes include the [Orange Book](https://www.gov.uk/government/publications/orange-book), the [AI Playbook](https://www.gov.uk/government/publications/ai-playbook-for-the-uk-government/artificial-intelligence-playbook-for-the-uk-government-html), [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [NCSC CAF](https://www.ncsc.gov.uk/collection/cyber-assessment-framework), the [Local Digital Declaration](https://www.localdigital.gov.uk/declaration/) and [Open Referral UK](https://openreferraluk.org/). A source link is an invitation to inspect its scope, not automatic inheritance of its requirements or licence. Historical unavailable routes stay visible in the catalogue; current alternatives do not silently replace them.

## What remains outstanding

Independent architecture/domain, legal/information-owner, accessibility and operational acceptance remain open. Actual appointed roles, justified thresholds, model/system/user evidence, supplier decisions, authenticated backend enforcement and exercised recovery require a real service. PSAI source-revision/licence uncertainty and unavailable onward references remain gaps. Workbook native recalculation is not established by extraction. No new WCC/NDL acquisition, probing, county-coverage check or remediation is part of this supplement.

The frozen learning graph and native walkthrough retain their original source and interface identities. Indexing this supplement in the Ask tools would require another explicit content/profile revision and fresh evidence fixtures; it is not silently claimed here.

## Attribution and handling

This guide contains short independent summaries and local analysis; it republishes no supplied private document, workbook, image or third-party attachment. Contains public sector information licensed under the Open Government Licence v3.0 where applicable; source exceptions and separate code/content licences remain. The GDS/DSIT/AISI attribution does not imply endorsement. Original titles and URLs retain publisher spelling; original teaching prose uses British English.
