import { LIMITS } from './engine.mjs';

export const URL_ORIGINS = Object.freeze(['https://www.gov.uk', 'https://www.security.gov.uk', 'https://assets.publishing.service.gov.uk', 'https://www.ncsc.gov.uk']);
export function publicURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Enter a complete public HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !URL_ORIGINS.includes(url.origin)) throw new Error('Live retrieval is limited to the listed public government origins. Drop a permitted local copy for other sources.');
  const secret = /^(access_token|id_token|token|auth|authorization|key|api_key|password|secret|sig|signature|session|code|x-amz-.+)$/i;
  if ([...url.searchParams.keys()].some(k => secret.test(k))) throw new Error('Do not use credential-bearing or signed URLs.');
  url.hash = '';
  return url;
}

function decoded(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, code) => {
    if (code[0] !== '#') return named[code.toLowerCase()] ?? all;
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '�';
  });
}
export function htmlText(html) {
  // String extraction only: no foreign DOM, scripts, images or frames are created.
  return decoded(html.replace(/<!--[^]*?-->/g, '').replace(/<(script|style|noscript|iframe|object|svg)\b[^>]*>[^]*?<\/\1\s*>/gi, '').replace(/<\/(?:p|div|h[1-6]|li|tr|section|article)>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function fileKind(name, header) {
  const ext = name.toLowerCase().split('.').at(-1);
  if (ext === 'pdf' && new TextDecoder().decode(header.slice(0, 5)) === '%PDF-') return 'pdf';
  if (ext === 'docx' && header[0] === 0x50 && header[1] === 0x4b && header[2] === 3 && header[3] === 4) return 'docx';
  if (['txt', 'md', 'json', 'csv', 'html', 'htm'].includes(ext)) return ext;
  throw new Error('Use PDF, DOCX, TXT, Markdown, JSON, CSV or HTML. Images, macros, legacy DOC and OCR are not supported.');
}

export async function documentIdentity(text) {
  const bytes = new TextEncoder().encode(text);
  return 'doc-' + [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

function limit(text, maximum = LIMITS.text) {
  const omitted = Math.max(0, text.length - maximum);
  return { text: text.slice(0, maximum), complete: !omitted, limitations: omitted ? [`Text is limited to the first ${maximum.toLocaleString('en-GB')} characters; ${omitted.toLocaleString('en-GB')} characters were omitted.`] : [] };
}

export async function readFile(file, signal) {
  if (!file || file.size > LIMITS.file || !file.size) throw new Error('Choose a non-empty document of up to 10 MB.');
  const data = new Uint8Array(await file.arrayBuffer());
  signal?.throwIfAborted();
  const kind = fileKind(file.name, data);
  let text, details = [], allPages = true;
  if (kind === 'docx') {
    const { unzipSync, strFromU8 } = await import('../vendor/fflate.mjs');
    let entryCount = 0, mainSeen = false;
    const entries = unzipSync(data, { filter: entry => {
      if (++entryCount > 1000) throw new Error('The DOCX has more than 1,000 archive entries.');
      if (entry.name !== 'word/document.xml') return false;
      if (mainSeen) throw new Error('The DOCX contains duplicate main document parts.');
      mainSeen = true;
      if (entry.originalSize > 3 * 1024 * 1024 || entry.originalSize > Math.max(100000, file.size * 150)) throw new Error('The DOCX text exceeds the safe extraction limit.');
      return true;
    } });
    if (!entries['word/document.xml']) throw new Error('The file has no main Word document.');
    const xml = strFromU8(entries['word/document.xml']);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Document type and external entity declarations are not accepted.');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('The Word document XML is invalid.');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paras = [...doc.getElementsByTagNameNS(ns, 'p')];
    const deleted = node => { for (let p = node.parentElement; p; p = p.parentElement) if (p.namespaceURI === ns && p.localName === 'del') return true; return false; };
    text = paras.map(p => [...p.getElementsByTagNameNS(ns, 't')].filter(n => !deleted(n)).map(n => n.textContent).join('')).filter(Boolean).join('\n');
    details = ['DOCX: main-body paragraphs and table text; inserted text included, deleted revisions, comments, footnotes, images, macros and embedded files excluded. Extracted-line locators are not Word page numbers.'];
  } else if (kind === 'pdf') {
    const pdfjs = await import('../vendor/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdf.worker.mjs', import.meta.url).href;
    const loading = pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: true, useWorkerFetch: false, enableXfa: false });
    let doc;
    try {
      doc = await loading.promise;
      const pages = [], maximum = Math.min(doc.numPages, 40);
      allPages = doc.numPages <= maximum;
      for (let n = 1; n <= maximum; n++) {
        signal?.throwIfAborted();
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        pages.push(`[PDF page ${n}]\n` + content.items.map(i => i.str + (i.hasEOL ? '\n' : ' ')).join(''));
        if (pages.join('\n').length > LIMITS.text) break;
      }
      text = pages.join('\n\n');
      details = [`PDF text layer only; no OCR, image interpretation, annotations, attachments or embedded JavaScript execution. Read ${pages.length} of ${doc.numPages} pages. Text extraction can lose layout and characters.`, ...(!allPages ? ['Only the first 40 pages are within this review scope.'] : [])];
    } finally { await loading.destroy(); }
  } else {
    text = new TextDecoder('utf-8', { fatal: false }).decode(data);
    if (kind === 'html' || kind === 'htm') text = htmlText(text);
    details = [`${kind.toUpperCase()} extracted as text. Embedded instructions, links and markup are not executed.`];
  }
  signal?.throwIfAborted();
  if (!text?.trim()) throw new Error('No usable text was found. For an image-only PDF, provide a permitted text transcription; this site performs no OCR.');
  const bounded = limit(text.trim());
  return { id: await documentIdentity(bounded.text), name: file.name, ...bounded, complete: bounded.complete && allPages, scope: 'Browser-local extracted document text', limitations: [...details, ...bounded.limitations], origin: 'local-file' };
}

async function boundedResponse(response, signal) {
  if (!response.ok) throw new Error(`The public source returned HTTP ${response.status}.`);
  const declared = Number(response.headers.get('content-length'));
  if (declared > LIMITS.file) throw new Error('The source is larger than the retrieval limit.');
  const reader = response.body.getReader(), chunks = [];
  let total = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > LIMITS.file) throw new Error('The source is larger than the retrieval limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const data = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return data;
}

export async function readURL(value, library, catalogue, signal) {
  // A known non-government reference has a deliberately small stored selection.
  // It never expands the origins available for arbitrary live retrieval.
  let selected;
  try { const requested = new URL(value); requested.hash = ''; selected = library.sources.find(s => s.url === requested.href); } catch { /* The public URL validator supplies the user-facing error. */ }
  if (selected && !URL_ORIGINS.includes(new URL(selected.url).origin)) {
    const text = library.passages.filter(p => p.source_id === selected.id).map(p => `[${p.id}: ${p.locator}]\n${p.text}`).join('\n\n');
    return { id: await documentIdentity(text), name: selected.title, text, complete: false, scope: 'Curated public snapshot excerpts; live retrieval is not enabled for this origin', limitations: ['Only the selected labelled public paraphrase is reviewed. The live article and its embedded resources were not requested.', 'Original observation: ' + selected.observed_at], origin: 'snapshot-excerpts', original_url: selected.url };
  }
  const url = publicURL(value);
  const key = value => { const u = new URL(value); return u.origin + decodeURI(u.pathname).replace(/\/$/, ''); };
  const record = catalogue.find(r => key(r.url) === key(url.href));
  if (record?.access === 'Sign-in required') throw new Error('The public catalogue marks this source Sign-in required. This site will not retrieve or analyse its protected body. Open its public discovery card, or drop a copy you are permitted to analyse locally.');
  const source = library.sources.find(s => key(s.url) === key(url.href));
  if (url.origin === 'https://www.security.gov.uk' && !record && !source) throw new Error('This security.gov.uk address is outside the reviewed public catalogue and source selection. Open the original yourself or drop a copy you are permitted to analyse locally.');
  let target = url.href;
  if (url.origin === 'https://www.gov.uk') target = 'https://www.gov.uk/api/content' + url.pathname;
  try {
    const response = await fetch(target, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal, cache: 'no-store' });
    const bytes = await boundedResponse(response, signal);
    const type = response.headers.get('content-type') || '';
    if (type.includes('application/pdf') || new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-') {
      const doc = await readFile(new File([bytes], 'public-url-document.pdf', { type: 'application/pdf' }), signal);
      return { ...doc, name: url.pathname.split('/').filter(Boolean).at(-1) || url.hostname, origin: 'public-url', original_url: url.href };
    }
    const raw = new TextDecoder().decode(bytes);
    let text;
    if (url.origin === 'https://www.gov.uk') {
      const data = JSON.parse(raw);
      const body = data.details?.body;
      if (typeof body !== 'string') throw new Error('The Content API did not provide a main text body.');
      text = data.title + '\n\n' + htmlText(body);
    } else text = htmlText(raw);
    if (!text.trim()) throw new Error('No usable public text was returned.');
    if (url.origin === 'https://www.security.gov.uk' && /This is restricted content|\(Sign in required\)/i.test(text)) throw new Error('The live public response marks this content as restricted.');
    const bounded = limit(text);
    return { id: await documentIdentity(bounded.text), name: source?.title || url.pathname.split('/').filter(Boolean).at(-1) || url.hostname, ...bounded, scope: 'Live public URL text fetched without credentials', limitations: ['Browser CORS and source access rules apply. Foreign HTML is converted to strings; links, images and scripts are not executed.', ...bounded.limitations], origin: 'public-url', original_url: url.href };
  } catch (error) {
    if (signal?.aborted) throw error;
    const passages = source ? library.passages.filter(p => p.source_id === source.id) : [];
    if (passages.length) {
      const text = passages.map(p => `[${p.id}: ${p.locator}]\n${p.text}`).join('\n\n');
      return { id: await documentIdentity(text), name: source.title, text, complete: false, scope: 'Curated public snapshot excerpts; live page retrieval was unavailable', limitations: ['The URL was not retrieved live. This review covers selected stored public excerpts, including labelled paraphrases, not the whole source.', 'Original observation: ' + source.observed_at], origin: 'snapshot-excerpts', original_url: url.href };
    }
    throw new Error('The browser could not retrieve this public URL. No server proxy or login is used. Open it yourself and drop or paste a copy you are permitted to analyse.');
  }
}
