const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = {
  staff: { identifier: 'ngozi.umeh', canManage: false },
  technician: { identifier: 'chinedu.obi', canManage: false },
  ict_officer: { identifier: 'ibrahim.musa', canManage: true },
  admin: { identifier: 'admin', canManage: true },
};

function resolveErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.error || payload.message || fallback;
}

async function api(path, { method = 'GET', token, body, expect = [200] } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!expect.includes(response.status)) {
    throw new Error(`${method} ${path} -> ${response.status}: ${resolveErrorMessage(payload, response.statusText)}`);
  }

  return { status: response.status, payload };
}

async function login(identifier) {
  const { payload } = await api('/auth/login', {
    method: 'POST',
    body: { identifier, password: PASSWORD },
  });

  return payload;
}

function buildArticlePayload(label, unique) {
  return {
    title: `Phase 8 React KB Verification ${label} ${unique}`,
    slug: `phase-8-react-kb-verification-${label}-${unique}`,
    summary: 'Controlled article created by the React Knowledge Base live verification script.',
    body: 'This article validates create, update, feedback, detail, relation, and revision endpoint compatibility.',
    category: 'Verification',
    status: 'published',
    visibility_scope: 'all_users',
    department_id: null,
    search_keywords: 'phase8,react,verification',
    change_note: 'Initial React Knowledge Base verification create.',
    relations: [
      { relation_type: 'asset_type', asset_type: 'Laptop' },
      { relation_type: 'ticket_category', ticket_category: 'Network' },
    ],
  };
}

async function verifyCommonReadAccess(label, session, summary) {
  const { payload: articles } = await api('/knowledge-base?search=&category=', { token: session.token });
  const articleCount = Array.isArray(articles) ? articles.length : 0;
  summary.accounts[label].visible_articles = articleCount;

  await api('/knowledge-base/suggestions?subject=network&description=laptop%20access&limit=3', {
    token: session.token,
    expect: [200],
  });

  if (!articleCount) {
    summary.accounts[label].detail_checked = false;
    summary.accounts[label].feedback_checked = false;
    return;
  }

  const firstArticle = articles[0];
  const articleId = firstArticle.article_id;
  await api(`/knowledge-base/${articleId}`, { token: session.token });
  await api(`/knowledge-base/${articleId}/revisions`, { token: session.token });
  try {
    await api(`/knowledge-base/${articleId}/feedback`, {
      method: 'POST',
      token: session.token,
      body: { is_helpful: true, feedback_note: `Phase 8 React live check by ${label}` },
      expect: [201],
    });
    summary.accounts[label].feedback_checked = true;
  } catch (error) {
    summary.accounts[label].feedback_checked = false;
    summary.accounts[label].feedback_error = error.message;
    summary.limitations.push({
      account: label,
      endpoint: `POST /knowledge-base/${articleId}/feedback`,
      error: error.message,
    });
  }

  summary.accounts[label].detail_checked = true;
}

async function verifyManagementAccess(label, session, canManage, unique, summary) {
  const payload = buildArticlePayload(label, unique);

  if (!canManage) {
    await api('/knowledge-base', {
      method: 'POST',
      token: session.token,
      body: payload,
      expect: [403],
    });
    summary.accounts[label].create_article = 'denied_as_expected';
    return;
  }

  const { payload: created } = await api('/knowledge-base', {
    method: 'POST',
    token: session.token,
    body: payload,
    expect: [201],
  });

  const { payload: updated } = await api(`/knowledge-base/${created.article_id}`, {
    method: 'PUT',
    token: session.token,
    body: {
      ...payload,
      title: `${payload.title} Updated`,
      summary: 'Updated during React Knowledge Base live verification.',
      change_note: 'React Knowledge Base verification update.',
    },
    expect: [200],
  });

  const { payload: revisions } = await api(`/knowledge-base/${created.article_id}/revisions`, {
    token: session.token,
    expect: [200],
  });

  summary.accounts[label].create_article = {
    article_id: created.article_id,
    initial_status: created.status,
    updated_title: updated.title,
    revision_count: Array.isArray(revisions) ? revisions.length : 0,
  };
}

async function main() {
  const unique = Date.now();
  const summary = {
    checked_at: new Date().toISOString(),
    api_base: API_BASE,
    accounts: {},
    limitations: [],
  };

  for (const [label, account] of Object.entries(accounts)) {
    const session = await login(account.identifier);
    const { payload: me } = await api('/auth/me', { token: session.token });
    summary.accounts[label] = {
      role: me.role,
      user_id: me.user_id,
    };

    await verifyCommonReadAccess(label, session, summary);
    await verifyManagementAccess(label, session, account.canManage, unique, summary);
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.limitations.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[knowledge-base-live-check] Failed:', error.message);
  process.exitCode = 1;
});
