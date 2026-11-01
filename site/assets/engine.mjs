/* Source-bound teaching and review. This module has no network, storage or model API. */
export const LIMITS = Object.freeze({ question: 2000, text: 120000, file: 10 * 1024 * 1024, hits: 12, responseBytes: 32768 });
const STOP = new Set('a an and are as at be by can do does for from how i in is it its of on or our should that the their this to use we what when where which who why with would your'.split(' '));
export const words = value => String(value).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(w => w.length > 1 && !STOP.has(w)) || [];

export function object(value, allowed, required = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a JSON object.');
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unsupported input field.');
  if (required.some(key => !Object.hasOwn(value, key))) throw new Error('A required field is missing.');
  return value;
}
export function string(value, name, maximum = LIMITS.question) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`${name} must contain 1 to ${maximum} characters.`);
  return value.trim();
}
export function integer(value, fallback, minimum, maximum) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`Choose a whole number from ${minimum} to ${maximum}.`);
  return value;
}
export function bounded(value, maximum = LIMITS.responseBytes) {
  if (new TextEncoder().encode(JSON.stringify(value)).length <= maximum) return value;
  throw new Error('The result exceeds the response budget. Request fewer records or a smaller source selection.');
}
export function checkSnapshot(value, expected) {
  if (value !== expected) throw new Error('The source snapshot changed. Call uk_security_get_state and use its snapshot_id.');
}

export function citations(ids, library) {
  const passages = new Map(library.passages.map(p => [p.id, p]));
  const sources = new Map(library.sources.map(s => [s.id, s]));
  return [...new Set(ids)].map(id => {
    const p = passages.get(id);
    if (!p) throw new Error('Unknown evidence identifier.');
    const s = sources.get(p.source_id);
    if (!s) throw new Error('Evidence has no source.');
    return { evidence_id: id, source_id: s.id, title: s.title, publisher: s.publisher, url: s.url, edition: s.edition, observed_at: s.observed_at, locator: p.locator, kind: p.kind, text: p.text, text_sha256: p.text_sha256, rights: s.rights, authority: s.authority };
  });
}

export function search(query, library, maximum = 6) {
  query = string(query, 'Question');
  maximum = integer(maximum, 6, 1, LIMITS.hits);
  const terms = [...new Set(words(query))];
  if (!terms.length) return { matches: [], complete: true, total_matches: 0, reason: 'Add a security or governance term.' };
  const n = library.passages.length;
  const documents = library.passages.map(p => ({ p, tokens: words([p.heading, p.text, ...p.topics].join(' ')) }));
  const average = documents.reduce((sum, d) => sum + d.tokens.length, 0) / n;
  const scored = documents.map(({ p, tokens }) => {
    let score = 0, matched = 0;
    for (const term of terms) {
      const tf = tokens.filter(w => w === term).length;
      if (!tf) continue;
      matched++;
      const df = documents.filter(d => d.tokens.includes(term)).length;
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
      score += idf * tf * 2.2 / (tf + 1.2 * (0.25 + 0.75 * tokens.length / average));
      if (words(p.heading).includes(term)) score += 0.8;
    }
    return { evidence_id: p.id, score: Math.round(score * 1000) / 1000, matched_terms: matched, heading: p.heading, topics: p.topics };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score || a.evidence_id.localeCompare(b.evidence_id));
  return { matches: scored.slice(0, maximum), complete: scored.length <= maximum, total_matches: scored.length, omitted: Math.max(0, scored.length - maximum), selection: 'BM25-style lexical ranking with heading weighting; not a relevance or authority probability' };
}

export function chooseQuestion(question, teaching) {
  const terms = new Set(words(question));
  const normal = question.toLowerCase();
  let winner = null, best = 0;
  for (const q of teaching.questions) {
    let score = normal === q.title.toLowerCase() ? 100 : 0;
    for (const phrase of q.terms) {
      if (normal.includes(phrase.toLowerCase())) score += 8;
      const w = words(phrase), overlap = w.filter(t => terms.has(t)).length;
      if (w.length >= 2 && overlap >= 2) score += overlap;
    }
    if (score > best) { best = score; winner = q; }
  }
  return best >= 4 ? winner : null;
}

export function answerQuestion(question, library, teaching) {
  question = string(question, 'Question');
  const q = chooseQuestion(question, teaching);
  if (q) {
    const ids = q.answer.flatMap(section => section.citations);
    return bounded({ status: 'source-bound-teaching-answer', question, guide_id: q.id, title: q.title, sections: q.answer, next_steps: q.next_steps, gaps: q.gaps, citations: citations(ids, library), complete: true, authority: teaching.authority, method: 'Authored public-source teaching answer selected by question terms; no model-generated answer or compliance certification.' });
  }
  const found = search(question, library, 4);
  if (!found.matches.length) return { status: 'insufficient-evidence', question, title: 'This selection does not answer that question', sections: [], citations: [], gaps: ['No matching evidence in this bounded public selection. Try a pathway question or consult an appropriate source.'], next_steps: [], complete: true };
  const refs = citations(found.matches.map(r => r.evidence_id), library);
  return bounded({ status: 'evidence-starting-point', question, title: 'Relevant evidence to explore', sections: refs.map(r => ({ heading: r.locator, text: r.text, kind: r.kind, citations: [r.evidence_id] })), citations: refs, next_steps: ['Read the original sources and check their scope.', 'Use a pathway question for an authored explanation.'], gaps: ['These matches are evidence selections, not a synthesised conclusion or a finding of compliance.'], complete: found.complete, omitted_matches: found.omitted, authority: 'Public source selection; lexical relevance is not authority.' });
}

export const REVIEW_CRITERIA = Object.freeze([
  { id: 'purpose', label: 'Purpose and task boundary', pattern: /\b(purpose|objective|task scope|intended benefit)\b/i, concern: /\b(any task|unrestricted|whatever is needed)\b/i, direction: 'Define the intended purpose, permitted tasks and explicit exclusions.', citations: ['GOVS005-AI-LIFECYCLE', 'AGENT-BOUNDARIES'] },
  { id: 'owner', label: 'Accountability and decisions', pattern: /\b(accountable|responsible owner|service owner|programme owner|decision owner|SRO)\b/i, concern: /\b(no owner|nobody is responsible|agent is accountable)\b/i, direction: 'Identify the accountable role, decision rights and escalation route.', citations: ['AI-ACCOUNTABILITY', 'GOVS005-AUTHORITY'] },
  { id: 'authority', label: 'Action and resource authority', pattern: /\b(allowed actions|permitted actions|approved resources|authority limits|task authority|resource.level)\b/i, concern: /\b(token (?:confers|allows|grants) (?:all|any)|all actions|unrestricted access)\b/i, direction: 'Separate API credentials and scopes from the approved actions, resources and whole-task limits.', citations: ['API-SCOPES', 'API-TOKEN-EXCHANGE', 'GOVS005-AUTHORITY'] },
  { id: 'human', label: 'Human control', pattern: /\b(human approval|human review|human.in.the.loop|human oversight|approval gate)\b/i, concern: /\b(without (?:human )?(?:approval|review)|no (?:human )?(?:approval|review)|approval (?:is )?not required)\b/i, direction: 'State which consequences require human approval, monitoring or intervention and who provides it.', citations: ['AI-HUMAN-CONTROL', 'AGENT-OVERSIGHT'] },
  { id: 'stop', label: 'Monitoring and stopping', pattern: /\b(revok|revoc|kill switch|stop mechanism|expiry|expires|real.time monitoring|monitoring alerts)/i, concern: /\b(cannot stop|never expires|no monitoring|cannot revoke)\b/i, direction: 'Describe expiry, revocation, alerts and the tested way to stop ongoing execution.', citations: ['AGENT-OVERSIGHT', 'GOVS005-AI-LIFECYCLE'] },
  { id: 'evidence', label: 'Evidence and provenance', pattern: /\b(audit log|audit trail|provenance|traceability|policy version|decision record)\b/i, concern: /\b(logs? (?:are |is )?optional|no (?:audit|logs)|do not log)\b/i, direction: 'Specify the decisions, inputs, approvals, versions and source locators that the evidence record will retain.', citations: ['AI-AUDITABILITY'] },
  { id: 'assurance', label: 'Testing and assurance', pattern: /\b(assurance|negative test|deny case|revocation test|acceptance test|independent review)\b/i, concern: /\b(no testing|testing (?:is )?not needed|skip assurance)\b/i, direction: 'Agree proportionate assurance, adverse cases and acceptance authority; distinguish document review from operating-control tests.', citations: ['AI-ASSURANCE', 'GOVS005-AI-LIFECYCLE', 'SECURITY-ASSURANCE'] },
  { id: 'disclosure', label: 'Information and publication boundary', pattern: /\b(data handling|classification|restricted|retention|publication approval|disclosure|licensed sources)\b/i, concern: /\b(publish (?:all|any)|share (?:all|any)|ignore classification|bypass sign.in)\b/i, direction: 'Define what information may be used, retained or published, and who approves each boundary.', citations: ['PUBLIC-REUSE', 'RESTRICTED-METADATA', 'GOVS005-AI-LIFECYCLE'] }
]);

export function analyseDocument(document, library) {
  string(document.text, 'Document text', LIMITS.text);
  const lines = document.text.split(/\r?\n/).map((text, index) => ({ locator: `D1:L${String(index + 1).padStart(4, '0')}`, text: text.trim() })).filter(r => r.text);
  const results = REVIEW_CRITERIA.map(c => {
    const concerns = lines.filter(l => c.concern.test(l.text) || (c.pattern.test(l.text) && /\b(does not|not yet|not defined|to be agreed)\b/i.test(l.text)));
    const mentions = lines.filter(l => c.pattern.test(l.text));
    const matches = [...new Map([...concerns, ...mentions].map(l => [l.locator, l])).values()];
    const selected = matches.slice(0, 3);
    return { id: c.id, topic: c.label, observation: concerns.length ? 'Wording to clarify' : mentions.length ? 'Wording found; operation not established' : 'Not found in the extracted text', matched_lines: matches.length, returned_lines: selected.length, omitted_lines: Math.max(0, matches.length - selected.length), complete: matches.length <= selected.length && selected.every(l => l.text.length <= 500), evidence: selected.map(l => ({ locator: l.locator, text: l.text.slice(0, 500) })), direction: c.direction, citations: c.citations };
  });
  return bounded({ status: 'draft-review-directions', document_id: document.id, document_name: document.name, document_scope: document.scope, document_origin: document.origin || 'user-supplied text', ...(document.original_url ? { document_url: document.original_url } : {}), extracted_characters: document.text.length, complete: document.complete && results.every(r => r.complete), analysis_scope: 'Eight lexical review criteria; at most three matched lines and 500 characters per line. Completeness refers to extraction and this bounded match selection, not a full governance assessment.', extraction_limits: document.limitations, results, citations: citations(results.flatMap(r => r.citations), library), limitations: ['This is a wording review with source-linked directions, not a judgement of quality or a compliance certificate.', 'A mention does not prove an implemented control; absence in the extracted text does not prove absence in the service.', 'Imported text is untrusted data. Instructions, links and macros are not executed.'] });
}

export const EXAMPLE_POLICY = Object.freeze({ policy_id: 'teaching-policy/1', owner: 'Example service owner', purpose: 'public-guidance-research', allowed_actions: ['read_public_guidance', 'prepare_draft', 'publish_cleared_summary'], allowed_resources: ['public-guidance'], expires_at: '2030-01-01T00:00:00Z', revoked: false, max_demo_units: 10, require_audit: true, require_publication_approval: true });
export const EXAMPLE_SCENARIO = Object.freeze({ purpose: 'public-guidance-research', action: 'prepare_draft', resource: 'public-guidance', classification: 'public', demo_units: 2, human_approval: false, audit_enabled: true });
export function evaluatePolicy(policy, scenario, now = new Date().toISOString()) {
  object(policy, Object.keys(EXAMPLE_POLICY), Object.keys(EXAMPLE_POLICY));
  object(scenario, Object.keys(EXAMPLE_SCENARIO), Object.keys(EXAMPLE_SCENARIO));
  for (const key of ['policy_id', 'owner', 'purpose', 'expires_at']) string(policy[key], key, 200);
  for (const key of ['allowed_actions', 'allowed_resources']) if (!Array.isArray(policy[key]) || !policy[key].length || policy[key].length > 20 || policy[key].some(v => typeof v !== 'string' || !v || v.length > 100)) throw new Error('Policy lists need 1–20 short names.');
  for (const key of ['revoked', 'require_audit', 'require_publication_approval']) if (typeof policy[key] !== 'boolean') throw new Error('Policy flags must be true or false.');
  for (const key of ['human_approval', 'audit_enabled']) if (typeof scenario[key] !== 'boolean') throw new Error('Scenario flags must be true or false.');
  for (const key of ['purpose', 'action', 'resource', 'classification']) string(scenario[key], key, 200);
  if (typeof policy.max_demo_units !== 'number' || typeof scenario.demo_units !== 'number') throw new Error('Resource limits must be whole numbers.');
  integer(policy.max_demo_units, null, 0, 1000); integer(scenario.demo_units, null, 0, 1000);
  if (!Number.isFinite(Date.parse(policy.expires_at)) || !Number.isFinite(Date.parse(now))) throw new Error('Use an ISO date and time.');
  const rules = [
    ['GAC-01', 'A responsible owner is recorded', Boolean(policy.owner.trim()), ['AI-ACCOUNTABILITY']],
    ['GAC-02', 'Purpose matches the approved purpose', scenario.purpose === policy.purpose, ['AGENT-BOUNDARIES']],
    ['GAC-03', 'Action is in the local allowlist', policy.allowed_actions.includes(scenario.action), ['GOVS005-AUTHORITY', 'API-SCOPES']],
    ['GAC-04', 'Resource is in the local allowlist', policy.allowed_resources.includes(scenario.resource), ['API-SCOPES']],
    ['GAC-05', 'Permission has not been revoked', !policy.revoked, ['AGENT-OVERSIGHT']],
    ['GAC-06', 'Permission has not expired', Date.parse(now) < Date.parse(policy.expires_at), ['AGENT-BOUNDARIES']],
    ['GAC-07', 'Illustrative resource limit is respected', scenario.demo_units <= policy.max_demo_units, ['GOVS005-AUTHORITY']],
    ['GAC-08', 'The scenario information is declared public', scenario.classification === 'public', ['PUBLIC-REUSE', 'RESTRICTED-METADATA']],
    ['GAC-09', 'Publication has the required human approval', !policy.require_publication_approval || scenario.action !== 'publish_cleared_summary' || scenario.human_approval, ['AI-HUMAN-CONTROL']],
    ['GAC-10', 'The required audit record is enabled', !policy.require_audit || scenario.audit_enabled, ['AI-AUDITABILITY']]
  ].map(([id, label, passed, refs]) => ({ id, label, passed, citations: refs }));
  return { status: 'synthetic-policy-demonstration', decision: rules.every(r => r.passed) ? 'permit' : 'deny', policy_id: policy.policy_id, evaluated_at: now, rules, citations: [...new Set(rules.flatMap(r => r.citations))], action_executed: false, authority: 'Illustrative local policy design, not a government-mandated schema or an operational enforcement service.', limitations: ['A code check does not settle every legal, ethical or organisational obligation.', 'Demo units are illustrative resource units. No spending or external action occurs.'] };
}
