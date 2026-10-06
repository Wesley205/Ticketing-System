function mapArticleRow(row) {
  return row || null;
}

function mapArticleRows(rows) {
  return (rows || []).map(mapArticleRow);
}

function mapArticleMedia(media = []) {
  return (media || []).map((item) => ({
    media_id: item.media_id,
    article_id: item.article_id,
    file_name: item.file_name,
    mime_type: item.mime_type,
    file_size_bytes: item.file_size_bytes,
    caption: item.caption,
    alt_text: item.alt_text,
    sort_order: item.sort_order,
    created_at: item.created_at,
  }));
}

function mapArticleDetail(article, relations, feedback, revisions, media = []) {
  if (!article) return null;
  return {
    ...article,
    relations: relations || [],
    feedback_summary: feedback || null,
    revisions: revisions || [],
    media: mapArticleMedia(media),
  };
}

module.exports = {
  mapArticleMedia,
  mapArticleDetail,
  mapArticleRow,
  mapArticleRows,
};
