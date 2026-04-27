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
  'group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm transition duration-200 hover:border-zinc-700 hover:bg-zinc-900/70 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30';
const CARD_LABEL =
  'text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3';

export function renderResult(container, data) {
  const competitorsRows = data.competitors
    .map(
      (c) => `
        <tr class="border-b border-zinc-800/60 last:border-0 transition hover:bg-zinc-800/30">
          <td class="py-3 pr-4 align-top font-medium text-zinc-100">${escapeHTML(c.name)}</td>
          <td class="py-3 pr-4 align-top text-zinc-300">${escapeHTML(c.key_features)}</td>
          <td class="py-3 align-top text-zinc-400">${escapeHTML(c.weakness)}</td>
        </tr>`,
    )
    .join('');

  const diffItems = data.differentiation_points
    .map(
      (p) =>
        `<li class="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-200 transition hover:border-emerald-500/40 hover:bg-zinc-900/70">${escapeHTML(p)}</li>`,
    )
    .join('');

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-6 gap-4 mt-2 grid-flow-row-dense">
      <section data-section="summary" class="${CARD_BASE} md:col-span-4">
        <h2 class="${CARD_LABEL}">Project Summary</h2>
        <p class="text-base sm:text-lg leading-relaxed text-zinc-100">${escapeHTML(data.project_summary)}</p>
      </section>

      <section data-section="competitors" class="${CARD_BASE} md:col-span-6">
        <h2 class="${CARD_LABEL}">Competitors</h2>
        <div class="overflow-x-auto -mx-2 px-2">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                <th class="py-2 pr-4 font-medium">Name</th>
                <th class="py-2 pr-4 font-medium">Key features</th>
                <th class="py-2 font-medium">Weakness</th>
              </tr>
            </thead>
            <tbody>${competitorsRows}</tbody>
          </table>
        </div>
      </section>

      <section data-section="market" class="${CARD_BASE} md:col-span-3">
        <h2 class="${CARD_LABEL}">Market Analysis</h2>
        <div class="space-y-3 text-sm">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Trends</p>
            <p class="text-zinc-200 leading-relaxed">${escapeHTML(data.market_analysis.trends)}</p>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">Target audience</p>
            <p class="text-zinc-200 leading-relaxed">${escapeHTML(data.market_analysis.target_audience)}</p>
          </div>
        </div>
      </section>

      <section data-section="viability" class="${CARD_BASE} md:col-span-2">
        <h2 class="${CARD_LABEL}">Viability</h2>
        <div class="flex items-baseline gap-2 mb-3">
          <span data-testid="viability-score" class="text-5xl font-bold tabular-nums bg-gradient-to-br from-emerald-300 to-emerald-500 bg-clip-text text-transparent">${escapeHTML(data.viability.score)}</span>
          <span class="text-sm text-zinc-500">/ 100</span>
        </div>
        <span data-testid="viability-status" class="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">${escapeHTML(data.viability.status)}</span>
        <p class="mt-3 text-sm text-zinc-300 leading-relaxed">${escapeHTML(data.viability.reasoning)}</p>
      </section>

      <section data-section="differentiation" class="${CARD_BASE} md:col-span-3">
        <h2 class="${CARD_LABEL}">Differentiation</h2>
        <ul class="space-y-2">${diffItems}</ul>
      </section>

      <section data-section="master-prompt" class="${CARD_BASE} md:col-span-6">
        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Master Prompt</h2>
          <button
            type="button"
            data-testid="copy-btn"
            id="copy-btn"
            class="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            Copy to clipboard
          </button>
        </div>
        <pre data-testid="master-prompt" class="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs sm:text-[13px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">${escapeHTML(data.master_prompt)}</pre>
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
            class="w-full text-left rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 transition hover:border-zinc-700 hover:bg-zinc-800/60 group"
          >
            <span class="block text-sm text-zinc-200 truncate group-hover:text-white">${escapeHTML(summarizeIdea(r.idea))}</span>
            <time datetime="${escapeHTML(r.created_at)}" class="block text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">${escapeHTML(r.created_at)}</time>
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
