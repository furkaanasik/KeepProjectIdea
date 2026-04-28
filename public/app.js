// @ts-check

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CARD_BASE =
  'gradient-border group relative overflow-hidden rounded-2xl border border-white/10 glass p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-violet-500/10';
const CARD_LABEL =
  'text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 mb-3 flex items-center gap-2';
const CARD_DOT =
  '<span class="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"></span>';

export function renderResult(container, data) {
  const competitorsRows = data.competitors
    .map(
      (c) => `
        <tr class="border-b border-white/5 last:border-0 transition hover:bg-white/[0.03]">
          <td class="py-3 pr-4 align-top font-semibold text-zinc-50">${escapeHTML(c.name)}</td>
          <td class="py-3 pr-4 align-top text-zinc-300">${escapeHTML(c.key_features)}</td>
          <td class="py-3 align-top text-zinc-400">${escapeHTML(c.weakness)}</td>
        </tr>`,
    )
    .join('');

  const diffItems = data.differentiation_points
    .map(
      (p, i) =>
        `<li class="group/diff flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-zinc-200 transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]">
          <span class="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-[11px] font-bold text-fuchsia-200 ring-1 ring-inset ring-white/10">${i + 1}</span>
          <span class="leading-relaxed">${escapeHTML(p)}</span>
        </li>`,
    )
    .join('');

  const score = Number(data.viability.score) || 0;
  const scorePct = Math.max(0, Math.min(100, score));

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2 grid-flow-row-dense">
      <section data-section="summary" class="${CARD_BASE} md:col-span-4">
        <h2 class="${CARD_LABEL}">${CARD_DOT} Project Summary</h2>
        <p class="text-base sm:text-lg leading-relaxed text-zinc-100">${escapeHTML(data.project_summary)}</p>
      </section>

      <section data-section="competitors" class="${CARD_BASE} md:col-span-6">
        <h2 class="${CARD_LABEL}">${CARD_DOT} Competitors</h2>
        <div class="overflow-x-auto -mx-2 px-2">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.18em] text-zinc-500 border-b border-white/10">
                <th class="py-2 pr-4 font-semibold">Name</th>
                <th class="py-2 pr-4 font-semibold">Key features</th>
                <th class="py-2 font-semibold">Weakness</th>
              </tr>
            </thead>
            <tbody>${competitorsRows}</tbody>
          </table>
        </div>
      </section>

      <section data-section="market" class="${CARD_BASE} md:col-span-3">
        <h2 class="${CARD_LABEL}">${CARD_DOT} Market Analysis</h2>
        <div class="space-y-4 text-sm">
          <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80 mb-1.5">Trends</p>
            <p class="text-zinc-200 leading-relaxed">${escapeHTML(data.market_analysis.trends)}</p>
          </div>
          <div class="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/80 mb-1.5">Target audience</p>
            <p class="text-zinc-200 leading-relaxed">${escapeHTML(data.market_analysis.target_audience)}</p>
          </div>
        </div>
      </section>

      <section data-section="viability" class="${CARD_BASE} md:col-span-2">
        <h2 class="${CARD_LABEL}">${CARD_DOT} Viability</h2>
        <div class="flex items-baseline gap-2 mb-3">
          <span data-testid="viability-score" class="text-5xl font-extrabold tabular-nums bg-gradient-to-br from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">${escapeHTML(data.viability.score)}</span>
          <span class="text-sm text-zinc-500">/ 100</span>
        </div>
        <div class="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div class="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all duration-700" style="width: ${scorePct}%"></div>
        </div>
        <span data-testid="viability-status" class="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
          <span class="h-1.5 w-1.5 rounded-full bg-fuchsia-300"></span>
          ${escapeHTML(data.viability.status)}
        </span>
        <p class="mt-3 text-sm text-zinc-300 leading-relaxed">${escapeHTML(data.viability.reasoning)}</p>
      </section>

      <section data-section="differentiation" class="${CARD_BASE} md:col-span-3">
        <h2 class="${CARD_LABEL}">${CARD_DOT} Differentiation</h2>
        <ul class="space-y-2">${diffItems}</ul>
      </section>

      <section data-section="master-prompt" class="${CARD_BASE} md:col-span-6">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 class="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-2">${CARD_DOT} Master Prompt</h2>
          <button
            type="button"
            data-testid="copy-btn"
            id="copy-btn"
            class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            Copy to clipboard
          </button>
        </div>
        <pre data-testid="master-prompt" class="scroll-thin rounded-xl border border-white/10 bg-black/50 p-4 text-xs sm:text-[13px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">${escapeHTML(data.master_prompt)}</pre>
      </section>
    </div>
  `;

  const copyBtn = container.querySelector('[data-testid="copy-btn"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      void navigator.clipboard.writeText(data.master_prompt);
    });
  }
}

export function renderError(container, message) {
  container.textContent = message;
  container.classList.remove('hidden');
}

export function clearError(container) {
  container.textContent = '';
  container.classList.add('hidden');
}

export function extractErrorMessage(payload) {
  if (!payload || typeof payload !== 'object') return 'Request failed';
  if (typeof payload.error === 'string') {
    if (Array.isArray(payload.issues) && payload.issues.length > 0) {
      const first = payload.issues[0];
      const path = Array.isArray(first.path) ? first.path.join('.') : '';
      return path
        ? `${payload.error}: ${path} — ${first.message}`
        : `${payload.error}: ${first.message}`;
    }
    return payload.error;
  }
  return 'Request failed';
}

export async function submitIdea(idea, fetchImpl = fetch) {
  const res = await fetchImpl('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

export async function fetchRecentAnalyses(fetchImpl = fetch) {
  const res = await fetchImpl('/api/analyses');
  if (!res.ok) return [];
  try {
    const body = await res.json();
    return Array.isArray(body) ? body : [];
  } catch {
    return [];
  }
}

function summarizeIdea(idea, max = 60) {
  const trimmed = String(idea ?? '').trim().replace(/\s+/g, ' ');
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

export function renderRecentList(listEl, emptyEl, records, onSelect) {
  if (!Array.isArray(records) || records.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  listEl.innerHTML = records
    .map(
      (r) => `
        <li>
          <button
            type="button"
            data-testid="recent-item"
            data-id="${escapeHTML(r.id)}"
            class="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-fuchsia-400/40 hover:bg-white/[0.05]"
          >
            <span class="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-violet-400 via-fuchsia-400 to-cyan-300 opacity-0 transition group-hover:opacity-100"></span>
            <span class="block text-sm text-zinc-200 truncate group-hover:text-white">${escapeHTML(summarizeIdea(r.idea))}</span>
            <time datetime="${escapeHTML(r.created_at)}" class="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-zinc-500">${escapeHTML(r.created_at)}</time>
          </button>
        </li>`,
    )
    .join('');

  const buttons = listEl.querySelectorAll('button[data-testid="recent-item"]');
  buttons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      onSelect(records[idx]);
    });
  });
}

export function wireForm(doc) {
  const form = doc.getElementById('analyze-form');
  const textarea = doc.getElementById('idea');
  const submitBtn = doc.getElementById('submit-btn');
  const status = doc.getElementById('status');
  const errorBox = doc.getElementById('error');
  const results = doc.getElementById('results');
  const recentList = doc.getElementById('recent-list');
  const recentEmpty = doc.getElementById('recent-empty');

  if (!form || !textarea || !submitBtn || !status || !errorBox || !results) {
    return;
  }

  const refreshRecent = async () => {
    if (!recentList) return;
    const records = await fetchRecentAnalyses();
    renderRecentList(recentList, recentEmpty, records, (record) => {
      clearError(errorBox);
      renderResult(results, record.result);
    });
  };

  void refreshRecent();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(errorBox);
    results.innerHTML = '';
    submitBtn.disabled = true;
    status.classList.remove('hidden');

    try {
      const idea = String(textarea.value || '').trim();
      const { ok, body } = await submitIdea(idea);
      if (!ok) {
        renderError(errorBox, extractErrorMessage(body));
        return;
      }
      renderResult(results, body);
      void refreshRecent();
    } catch (err) {
      renderError(errorBox, err instanceof Error ? err.message : 'Network error');
    } finally {
      submitBtn.disabled = false;
      status.classList.add('hidden');
    }
  });
}

if (typeof document !== 'undefined' && document.getElementById('analyze-form')) {
  wireForm(document);
}
