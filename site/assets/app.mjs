import { analyseDocument, EXAMPLE_POLICY, EXAMPLE_SCENARIO, citations } from './engine.mjs';
import { readFile, readURL, documentIdentity } from './documents.mjs';
import { createTools, registerNativeTools } from './tools.mjs';

const $ = id => document.getElementById(id);
const state = { revision: 1, document: null, consent: false, lastResult: null };
let tools = [], currentImport, messageTimer, nativeRegistration;
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const button = (text, action, className = 'text-button') => { const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', action); return b; };
const external = (text, url) => { const a = el('a', text); a.href = url; a.rel = 'noopener noreferrer'; a.target = '_blank'; return a; };
function message(text, error = false) { clearTimeout(messageTimer); $('app-message').textContent = text; $('app-message').hidden = false; $('app-message').setAttribute('role', error ? 'alert' : 'status'); messageTimer = setTimeout(() => { $('app-message').hidden = true; }, error ? 16000 : 6000); }
function download(name, value, type = 'application/json') { const data = typeof value === 'string' ? value : JSON.stringify(value, null, 2); const url = URL.createObjectURL(new Blob([data], { type })); const a = el('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function citationButtons(ids, target) { for (const id of [...new Set(ids)]) target.append(button(id, () => showCitation(id), 'citation-button')); }
function showCitation(id) {
  const ref = citations([id], state.library)[0], content = $('citation-content'); content.replaceChildren();
  $('citation-title').textContent = ref.title;
  content.append(el('span', ref.kind === 'source-quotation' ? 'PUBLIC SOURCE QUOTATION' : ref.kind === 'local-analysis' ? 'LOCAL TECHNICAL ANALYSIS' : 'LABELLED SOURCE PARAPHRASE', 'label ' + (ref.kind === 'source-quotation' ? 'source' : 'local')));
  content.append(el('blockquote', ref.text));
  const meta = el('div', undefined, 'source-meta');
  for (const [name, value] of [['Publisher', ref.publisher], ['Evidence', ref.evidence_id], ['Locator', ref.locator], ['Edition', ref.edition || 'See original source'], ['Observed', date(ref.observed_at)], ['Authority', ref.authority], ['Reuse scope', ref.rights]]) meta.append(el('p', `${name}: ${value}`));
  meta.append(external('Read the original source ↗', ref.url), el('p', 'Text SHA-256:'), el('code', ref.text_sha256)); content.append(meta);
  $('citation-dialog').showModal();
}
function date(value) { return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }); }
function renderAnswer(result) {
  const host = $('answer'); host.replaceChildren();
  const heading = el('div', undefined, 'answer-heading'); heading.append(el('p', result.status === 'source-bound-teaching-answer' ? 'SOURCE-BOUND EXPLANATION' : 'PUBLIC EVIDENCE SELECTION'), el('h3', result.title));
  const body = el('div', undefined, 'answer-body');
  for (const section of result.sections || []) {
    const row = el('section', undefined, 'answer-section');
    const kind = ({ 'source-guidance': 'Source guidance', 'source-quotation': 'Public source quotation', 'local-paraphrase': 'Source paraphrase', 'synthetic-example': 'Synthetic example', 'local-analysis': 'Local analysis' })[section.kind] || 'Local analysis';
    row.append(el('span', kind, 'label ' + (['Source guidance', 'Public source quotation', 'Source paraphrase'].includes(kind) ? 'source' : kind === 'Synthetic example' ? 'synthetic' : 'local')), el('h4', section.heading), el('p', section.text));
    citationButtons(section.citations, row); body.append(row);
  }
  const next = el('div', undefined, 'next-grid');
  for (const [title, values] of [['Directions for next work', result.next_steps || []], ['What this does not establish', result.gaps || []]]) {
    const part = el('div'); part.append(el('h4', title)); const ul = el('ul'); values.forEach(v => ul.append(el('li', v))); part.append(ul); next.append(part);
  }
  body.append(next); if (result.complete === false) body.append(el('p', 'This is a bounded evidence selection. Additional matches were omitted; use the source or search tools to continue.', 'notice'));
  host.append(heading, body);
}
function renderReview(result) {
  const host = $('document-result'); host.replaceChildren(); host.append(el('p', 'Draft wording review · source-linked directions for future work · no compliance certification', 'notice'));
  const cards = el('div', undefined, 'review-cards');
  for (const row of result.results) {
    const card = el('article', undefined, 'review-card'); card.append(el('span', row.observation, 'label ' + (row.observation.startsWith('Wording to') ? 'local' : '')), el('h4', row.topic));
    for (const quote of row.evidence) { const q = el('blockquote', quote.text); q.prepend(el('span', quote.locator + ' · ', 'locator')); card.append(q); }
    if (!row.complete) card.append(el('p', `Showing ${row.returned_lines} of ${row.matched_lines} matching lines, with up to 500 characters per line.`, 'small'));
    card.append(el('p', row.direction)); citationButtons(row.citations, card); cards.append(card);
  }
  host.append(cards);
}
function renderPolicy(result) {
  const host = $('policy-result'); host.replaceChildren(); const box = el('div', undefined, 'decision ' + result.decision);
  box.append(el('p', 'ILLUSTRATIVE POLICY DECISION', 'small'), el('strong', result.decision.toUpperCase()), el('p', 'No action was executed. Demo units are illustrative resource units.', 'small'));
  const ul = el('ul', undefined, 'rule-list');
  for (const rule of result.rules) { const li = el('li'); li.append(el('span', rule.passed ? '✓' : '×', rule.passed ? 'rule-pass' : 'rule-deny')); const info = el('div'); info.append(el('span', rule.id, 'rule-code'), el('span', rule.label)); citationButtons(rule.citations, info); li.append(info); ul.append(li); }
  box.append(ul); host.append(box);
}
function updateTool(name, result, transport) {
  $('tool-result').textContent = JSON.stringify(result, null, 2);
  $('invocation-mode').textContent = `${name} · ${transport} · snapshot ${state.snapshot_id} · revision ${state.revision}`;
  if (name === 'uk_security_answer') { $('question').value = result.question; renderAnswer(result); }
  if (name === 'uk_security_analyse_document' && result.status !== 'consent-required') renderReview(result);
  if (name === 'uk_security_evaluate_policy') renderPolicy(result);
  if (transport === 'native WebMCP callback') message(`Native WebMCP: ${name} completed. The result is shown on this page.`);
}
async function invoke(name, input) { const tool = tools.find(t => t.name === name); if (!tool) throw new Error('Tool not available.'); return tool.execute({ ...(name === 'uk_security_get_state' ? {} : { snapshot_id: state.snapshot_id }), ...input }, { manual: true }); }
async function ask(question) { $('question').value = question; try { await invoke('uk_security_answer', { question }); } catch (error) { message(error.message, true); } }
function showPathway(pathway) {
  const host = $('pathway-detail'); host.replaceChildren(el('h3', pathway.title), el('p', pathway.description)); const list = el('ol');
  for (const id of pathway.steps) { const q = state.teaching.questions.find(q => q.id === id); const li = el('li'); li.append(button(q.title, () => { ask(q.title); $('ask').scrollIntoView(); })); list.append(li); }
  host.append(list); host.hidden = false;
}
async function catalogue() { if (!state.catalogue) state.catalogue = await fetch('data/catalogue.json').then(r => { if (!r.ok) throw new Error('Catalogue metadata unavailable.'); return r.json(); }); return state.catalogue; }
async function setDocument(doc) {
  state.document = doc; state.consent = false; state.revision++; state.lastResult = null;
  $('tool-result').textContent = '';
  $('document-consent').checked = false; $('import-name').textContent = doc.name; $('import-scope').textContent = doc.scope;
  $('import-limits').textContent = doc.limitations.join(' '); $('import-controls').hidden = false;
  renderReview(analyseDocument(doc, state.library)); message('Review prepared locally. Page-tool sharing is off.');
}
function clearDocument() {
  currentImport?.abort(); state.document = null; state.consent = false; state.revision++; state.lastResult = null;
  $('document-consent').checked = false; $('import-controls').hidden = true; $('document-result').replaceChildren(); $('tool-result').textContent = ''; $('pasted-text').value = ''; $('document-url').value = ''; $('document-file').value = ''; message('The import and displayed review were cleared.');
}
async function importOperation(operation) {
  currentImport?.abort(); const controller = new AbortController(); currentImport = controller;
  state.consent = false; state.revision++; state.lastResult = null; $('document-consent').checked = false; $('tool-result').textContent = '';
  try { message('Reading the document locally…'); const doc = await operation(controller.signal); if (!controller.signal.aborted) await setDocument(doc); }
  catch (error) { if (!controller.signal.aborted) message(error.message, true); }
}
async function importURL(value) { await importOperation(async signal => { let records = []; try { if (new URL(value).origin === 'https://www.security.gov.uk') records = await catalogue(); } catch { /* The URL validator supplies the user-facing error. */ } return readURL(value, state.library, records, signal); }); }
async function importText(text, name = 'Pasted text') {
  if (!text.trim() || text.length > 120000) { message('Paste 1 to 120,000 characters.', true); return; }
  state.consent = false; state.revision++; state.lastResult = null; $('document-consent').checked = false; $('tool-result').textContent = '';
  await setDocument({ id: await documentIdentity(text), name, text, complete: true, scope: 'Browser-local pasted text', limitations: ['Text supplied by the user; instructions and embedded links are not executed.'], origin: 'pasted-text' });
}

function renderStatic() {
  $('source-count').textContent = state.library.sources.length; $('help-source-count').textContent = state.library.sources.length;
  for (const p of state.teaching.pathways) { const card = button('', () => showPathway(p), 'pathway-card'); card.append(el('span', `${p.minutes} minutes · ${p.steps.length} steps`, 'label'), el('h3', p.title), el('p', p.description), el('span', 'Start this pathway →', 'card-action')); $('pathways').append(card); }
  for (const q of state.teaching.questions.slice(0, 6)) $('question-examples').append(button(q.title, () => ask(q.title), ''));
  for (const concept of state.teaching.concepts) { const box = el('article', undefined, 'glossary-item'); box.append(el('h4', concept.label), el('p', concept.definition)); citationButtons(concept.citations, box); $('glossary').append(box); }
  for (const source of state.library.sources) { const item = el('article', undefined, 'source-item'); item.append(external(source.title + ' ↗', source.url), el('p', source.publisher + ' · ' + (source.edition || 'Observed ' + date(source.observed_at))), el('p', source.rights)); const refs = state.library.passages.filter(p => p.source_id === source.id).map(p => p.id); citationButtons(refs, item); $('sources').append(item); }
  $('policy-json').textContent = JSON.stringify(EXAMPLE_POLICY, null, 2);
  renderPolicy({ ...EXAMPLE_SCENARIO, decision: 'permit', rules: [] });
  const bundleURL = new URL('okf/okf-bundle.json', location.href); const explorer = new URL('explore/', location.href); explorer.searchParams.set('bundle', bundleURL.href); explorer.hash = 'learning/index'; $('explorer-link').href = explorer.href;
  $('build-identity').textContent = `Snapshot ${state.snapshot_id} · ${state.release.source_input_state === 'verified-commit' ? 'build' : 'candidate from'} ${state.release.source_commit.slice(0, 12)}`;
  for (const tool of tools) { const item = el('article', undefined, 'tool-card'); item.append(el('code', tool.name), el('p', tool.description)); const detail = el('details'); detail.append(el('summary', 'Input schema'), el('pre', JSON.stringify(tool.inputSchema, null, 2))); item.append(detail); $('tool-inventory').append(item); }
}
function events() {
  addEventListener('hashchange', replayQuestion);
  $('question-form').addEventListener('submit', event => { event.preventDefault(); ask($('question').value); });
  $('close-citation').addEventListener('click', () => $('citation-dialog').close());
  $('citation-dialog').addEventListener('click', event => { if (event.target === $('citation-dialog')) $('citation-dialog').close(); });
  $('choose-file').addEventListener('click', event => { event.stopPropagation(); $('document-file').click(); });
  $('drop-zone').addEventListener('click', event => { if (!event.target.closest('button')) $('document-file').click(); });
  $('drop-zone').addEventListener('keydown', event => { if (event.target === $('drop-zone') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); $('document-file').click(); } });
  $('document-file').addEventListener('change', event => { const file = event.target.files[0]; if (file) importOperation(signal => readFile(file, signal)); });
  for (const type of ['dragenter', 'dragover']) $('drop-zone').addEventListener(type, event => { event.preventDefault(); $('drop-zone').classList.add('dragover'); });
  for (const type of ['dragleave', 'drop']) $('drop-zone').addEventListener(type, () => $('drop-zone').classList.remove('dragover'));
  $('drop-zone').addEventListener('drop', event => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) importOperation(signal => readFile(file, signal)); else { const value = (event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain')).split('\n').find(v => v && !v.startsWith('#'))?.trim() || ''; if (/^https?:\/\//i.test(value)) { $('document-url').value = value; importURL(value); } else if (value) importText(event.dataTransfer.getData('text/plain'), 'Dropped text'); } });
  $('url-form').addEventListener('submit', event => { event.preventDefault(); importURL($('document-url').value); });
  $('review-paste').addEventListener('click', () => importText($('pasted-text').value));
  $('load-example').addEventListener('click', async () => { try { const r = await fetch('examples/agent-governance-plan.md'); if (!r.ok) throw new Error('Example unavailable.'); await importText(await r.text(), 'Fictional agent governance plan'); } catch (error) { message(error.message, true); } });
  $('clear-document').addEventListener('click', clearDocument);
  $('document-consent').addEventListener('change', event => { state.consent = Boolean(event.target.checked && state.document); state.revision++; state.lastResult = null; $('tool-result').textContent = ''; message(state.consent ? 'Page tools may now return the review and short extracts to your assistant.' : 'Document sharing through page tools is off.'); });
  $('policy-form').addEventListener('submit', async event => { event.preventDefault(); try { await invoke('uk_security_evaluate_policy', { policy: { ...structuredClone(EXAMPLE_POLICY), revoked: $('policy-revoked').checked }, scenario: { ...structuredClone(EXAMPLE_SCENARIO), action: $('policy-action').value, classification: $('policy-classification').value, demo_units: Number($('policy-units').value), human_approval: $('policy-approval').checked, audit_enabled: $('policy-audit').checked } }); } catch (error) { message(error.message, true); } });
  $('download-policy').addEventListener('click', () => download('example-governance-policy.json', EXAMPLE_POLICY));
  $('download-tool-result').addEventListener('click', () => { if (state.lastResult) download('security-evidence-result.json', state.lastResult); else message('There is no displayed tool result to download.'); });
  addEventListener('pagehide', () => { currentImport?.abort(); nativeRegistration?.dispose(); state.document = null; });
}

async function replayQuestion() {
  const prefix = '#question/';
  const id = location.hash.startsWith(prefix) ? location.hash.slice(prefix.length) : location.hash === '#example-question' ? state.teaching.questions[0].id : null;
  const question = state.teaching.questions.find(q => q.id === id);
  if (question) { await ask(question.title); requestAnimationFrame(() => $('ask').scrollIntoView()); }
}

async function init() {
  try {
    const data = await Promise.all(['data/evidence.json', 'data/teaching.json', 'release.json'].map(async url => { const r = await fetch(url); if (!r.ok) throw new Error('The public build is incomplete.'); return r.json(); }));
    [state.library, state.teaching, state.release] = data; state.snapshot_id = state.release.snapshot_id;
    tools = createTools(state, updateTool); renderStatic(); events();
    nativeRegistration = await registerNativeTools(tools, (status, error) => { $('native-status').textContent = status === 'registered' ? `${tools.length} native WebMCP tools registered` : status === 'unavailable' ? 'Manual interface ready · native tools unavailable here' : 'Manual interface ready · native registration failed'; $('native-explanation').textContent = status === 'registered' ? 'The browser registered the real WebMCP tools. Your AI host still needs a callable page-tool bridge. The manual controls use the same evidence and review logic.' : 'This browser has not registered native tools. All manual controls work. Native testing requires a supporting browser and the appropriate WebMCP feature; no replacement API is installed.'; if (error) console.warn('Native registration:', error); });
    await invoke('uk_security_evaluate_policy', {});
    await replayQuestion();
  } catch (error) { $('native-status').textContent = 'The learning data could not be loaded'; message(error.message, true); console.error(error); }
}
await init();
