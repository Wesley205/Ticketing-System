import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildArticleListQuery,
  buildRelationPayload,
  buildSuggestionQuery,
  normalizeArticleDetail,
  normalizeArticlePayload,
  normalizeArticleRow,
  slugifyTitle,
  splitRelations,
} from '../features/knowledge-base/services/knowledge-base-api.js';
import { buildAccessProfile, canAccessRoute } from '../permissions/access.js';
import { formatArticleCategory, formatArticleVisibility, safeArticleUrl } from '../features/knowledge-base/services/knowledge-base-copy.js';

test('knowledge-base reader uses clear labels and permits only credential-free HTTPS links', () => {
  assert.equal(formatArticleCategory('Security steps'), 'Security');
  assert.equal(formatArticleVisibility('all_users'), 'All staff');
  assert.equal(safeArticleUrl('https://support.microsoft.com/help'), 'https://support.microsoft.com/help');
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', 'https://user:password@example.com', '/relative']) {
    assert.equal(safeArticleUrl(value), null);
  }
});

test('knowledge-base list query keeps status manager-only', () => {
  const filters = { search: 'vpn', category: 'Network', status: 'draft' };

  assert.equal(
    buildArticleListQuery(filters, false).toString(),
    'search=vpn&category=Network'
  );
  assert.equal(
    buildArticleListQuery(filters, true).toString(),
    'search=vpn&category=Network&status=draft'
  );
});

test('knowledge-base suggestion query preserves backend keys', () => {
  assert.equal(
    buildSuggestionQuery({
      category: 'Network',
      subcategory: 'VPN',
      subject: 'Cannot connect',
      description: 'Remote access failure',
      affected_asset_id: 7,
      asset_type: 'Laptop',
      limit: 3,
    }).toString(),
    'category=Network&subcategory=VPN&subject=Cannot+connect&description=Remote+access+failure&affected_asset_id=7&asset_type=Laptop&limit=3'
  );
});

test('knowledge-base normalizers convert counters and safe arrays', () => {
  const row = normalizeArticleRow({
    article_id: 1,
    helpful_count: '2',
    not_helpful_count: '1',
    view_count: '9',
    current_revision_number: '4',
  });
  const detail = normalizeArticleDetail({ article_id: 1, title: 'VPN' });

  assert.equal(row.helpful_count, 2);
  assert.equal(row.not_helpful_count, 1);
  assert.equal(row.view_count, 9);
  assert.equal(row.current_revision_number, 4);
  assert.deepEqual(detail.relations, []);
  assert.deepEqual(detail.revisions, []);
});

test('knowledge-base relation helpers round-trip asset and ticket categories', () => {
  const relations = buildRelationPayload({
    asset_types: 'Laptop, Printer',
    ticket_categories: 'Network, Hardware',
  });
  const split = splitRelations(relations);

  assert.deepEqual(split.assetTypes, ['Laptop', 'Printer']);
  assert.deepEqual(split.ticketCategories, ['Network', 'Hardware']);
});

test('knowledge-base payload normalization preserves backend field names', () => {
  const payload = normalizeArticlePayload({
    title: ' Reset VPN Access ',
    slug: '',
    summary: ' Steps ',
    body: ' Use MFA ',
    category: ' Network ',
    status: 'published',
    visibility_scope: 'all_users',
    department_id: '',
    search_keywords: ' vpn, mfa ',
    change_note: 'Initial article',
    asset_types: 'Laptop',
    ticket_categories: 'Access Request',
  });

  assert.equal(slugifyTitle('Reset VPN Access!'), 'reset-vpn-access');
  assert.deepEqual(payload, {
    title: 'Reset VPN Access',
    slug: 'reset-vpn-access',
    summary: 'Steps',
    body: 'Use MFA',
    category: 'Network',
    status: 'published',
    visibility_scope: 'all_users',
    department_id: null,
    search_keywords: 'vpn, mfa',
    change_note: 'Initial article',
    relations: [
      { relation_type: 'asset_type', asset_type: 'Laptop' },
      { relation_type: 'ticket_category', ticket_category: 'Access Request' },
    ],
    media: [],
  });
});

test('knowledge-base payload preserves captioned article images', () => {
  const media = [{
    file_name: 'router-lights.webp',
    mime_type: 'image/webp',
    content_base64: 'data:image/webp;base64,AAAA',
    caption: 'Expected status lights',
    alt_text: 'Router with green power and network lights',
    sort_order: 0,
  }];

  const payload = normalizeArticlePayload({
    title: 'Check router lights',
    body: 'Compare the lights with the reference image.',
    media,
  });

  assert.deepEqual(payload.media, media);
});

test('knowledge-base route is available to authenticated users while management remains scoped', () => {
  const staffProfile = buildAccessProfile({ user_id: 9, role: 'staff', department_id: 4 });
  const officerProfile = buildAccessProfile({ user_id: 2, role: 'ict_officer', department_id: 1 });

  assert.equal(canAccessRoute(staffProfile, '/knowledge-base'), true);
  assert.equal(staffProfile.permissions.can_manage_knowledge_base, false);
  assert.equal(canAccessRoute(officerProfile, '/knowledge-base'), true);
  assert.equal(officerProfile.permissions.can_manage_knowledge_base, true);
});
