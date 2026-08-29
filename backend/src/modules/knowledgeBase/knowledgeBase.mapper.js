function mapArticleRow(row) {
  return row || null;
}

function mapArticleRows(rows) {
  return (rows || []).map(mapArticleRow);
}

function mapArticleDetail(article, relations, feedback, revisions) {
  if (!article) return null;
  return {
    ...article,
    relations: relations || [],
    feedback_summary: feedback || null,
    revisions: revisions || [],
  };
}

module.exports = {
  mapArticleDetail,
  mapArticleRow,
  mapArticleRows,
};
