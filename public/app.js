// @ts-check

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderResult(container, data) {
  const competitorsRows = data.competitors
    .map(
      (c) => `
        <tr>
          <td>${escapeHTML(c.name)}</td>
          <td>${escapeHTML(c.key_features)}</td>
          <td>${escapeHTML(c.weakness)}</td>
        </tr>`,
    )
    .join('');

  const diffItems = data.differentiation_points
    .map((p) => `<li>${escapeHTML(p)}</li>`)
    .join('');

  container.innerHTML = `
    <section data-section="summary">
      <h2>Project Summary</h2>
      <p>${escapeHTML(data.project_summary)}</p>
    </section>
    <section data-section="competitors">
      <h2>Competitors</h2>
      <table>
        <thead><tr><th>Name</th><th>Key features</th><th>Weakness</th></tr></thead>
        <tbody>${competitorsRows}</tbody>
      </table>
    </section>
    <section data-section="market">
      <h2>Market Analysis</h2>
      <p><strong>Trends:</strong> ${escapeHTML(data.market_analysis.trends)}</p>
      <p><strong>Target audience:</strong> ${escapeHTML(data.market_analysis.target_audience)}</p>
    </section>
    <section data-section="viability">
      <h2>Viability</h2>
      <p><span class="badge" data-testid="viability-score">${escapeHTML(data.viability.score)}</span>
         <span data-testid="viability-status">${escapeHTML(data.viability.status)}</span></p>
      <p>${escapeHTML(data.viability.reasoning)}</p>
    </section>
    <section data-section="differentiation">
      <h2>Differentiation</h2>
      <ul>${diffItems}</ul>
    </section>
    <section data-section="master-prompt">
      <h2>Master Prompt</h2>
      <pre data-testid="master-prompt">${escapeHTML(data.master_prompt)}</pre>
      <button type="button" data-testid="copy-btn" id="copy-btn">Copy to clipboard</button>
    </section>
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
          <button type="button" data-testid="recent-item" data-id="${escapeHTML(r.id)}">
            ${escapeHTML(summarizeIdea(r.idea))}
            <time datetime="${escapeHTML(r.created_at)}">${escapeHTML(r.created_at)}</time>
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
