const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const {
  canManageKnowledgeBase,
  canProvideKnowledgeBaseFeedback,
  canViewKnowledgeBaseArticle,
  constrainKnowledgeBaseVisibility,
} = require("../utils/authorization");
const {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  addKnowledgeBaseFeedback,
  buildKnowledgeArticleDetail,
  createKnowledgeBaseArticle,
  incrementKnowledgeArticleView,
  listKnowledgeBaseArticles,
  loadKnowledgeArticle,
  suggestKnowledgeBaseArticles,
  updateKnowledgeBaseArticle,
} = require("../services/knowledgeBase");

const router = express.Router();

function parseRelations(rawRelations) {
  if (!Array.isArray(rawRelations)) return [];
  return rawRelations.filter(Boolean).map((relation) => ({
    relation_type: relation.relation_type,
    asset_id: relation.asset_id || null,
    asset_type: relation.asset_type || null,
    ticket_category: relation.ticket_category || null,
    ticket_subcategory: relation.ticket_subcategory || null,
  }));
}

router.get("/", requireAuth, async (req, res) => {
  const clauses = [];
  const params = [];
  constrainKnowledgeBaseVisibility(req.user, { clauses, params, alias: "kba" });

  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(
      kba.title ILIKE $${params.length}::text
      OR kba.summary ILIKE $${params.length}::text
      OR kba.body ILIKE $${params.length}::text
      OR kba.search_keywords ILIKE $${params.length}::text
    )`);
  }
  if (req.query.category) {
    params.push(req.query.category);
    clauses.push(`kba.category = $${params.length}::varchar`);
  }
  if (req.query.status && canManageKnowledgeBase(req.user)) {
    params.push(req.query.status);
    clauses.push(`kba.status = $${params.length}::varchar`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  console.log("KB WHERE:", where);
  console.log("KB PARAMS:", params);

  try {
    const result = await pool.query(
      `SELECT kba.article_id, kba.title, kba.slug, kba.summary, kba.category, kba.status, kba.visibility_scope,
              kba.department_id, kba.helpful_count, kba.not_helpful_count, kba.view_count, kba.updated_at,
              d.name AS department_name
       FROM knowledge_base_articles kba
       LEFT JOIN departments d ON d.department_id = kba.department_id
       ${where}
       ORDER BY kba.updated_at DESC, kba.article_id DESC`,
      params,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load knowledge-base articles." });
  }
});

router.get("/suggestions", requireAuth, async (req, res) => {
  try {
    let assetType = req.query.asset_type || null;
    if (!assetType && req.query.affected_asset_id) {
      const assetResult = await pool.query(
        "SELECT asset_type FROM assets WHERE asset_id = $1",
        [req.query.affected_asset_id],
      );
      assetType = assetResult.rows[0]?.asset_type || null;
    }

    const suggestions = await suggestKnowledgeBaseArticles(
      pool,
      {
        subject: req.query.subject,
        description: req.query.description,
        category: req.query.category,
        subcategory: req.query.subcategory,
        asset_type: assetType,
      },
      Number(req.query.limit || 5),
    );

    const visible = suggestions.filter((article) =>
      canViewKnowledgeBaseArticle(req.user, article),
    );
    res.json(visible);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to load knowledge-base suggestions." });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const article = await buildKnowledgeArticleDetail(
      pool,
      Number(req.params.id),
    );
    if (!article) {
      return res
        .status(404)
        .json({ error: "Knowledge-base article not found." });
    }
    if (!canViewKnowledgeBaseArticle(req.user, article)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to view this article." });
    }

    await incrementKnowledgeArticleView(Number(req.params.id), pool);
    article.permissions = {
      can_manage: canManageKnowledgeBase(req.user),
      can_feedback: canProvideKnowledgeBaseFeedback(req.user),
    };
    res.json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load knowledge-base article." });
  }
});

router.post(
  "/",
  requireAuth,
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("slug").trim().notEmpty().withMessage("Slug is required"),
    body("body").trim().notEmpty().withMessage("Article body is required"),
    body("status")
      .optional()
      .isIn(ARTICLE_STATUSES)
      .withMessage("Invalid article status"),
    body("visibility_scope")
      .optional()
      .isIn(ARTICLE_VISIBILITY_SCOPES)
      .withMessage("Invalid visibility scope"),
  ],
  async (req, res) => {
    if (!canManageKnowledgeBase(req.user)) {
      return res.status(403).json({
        error: "You do not have permission to create knowledge-base articles.",
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const article = await createKnowledgeBaseArticle(
        {
          ...req.body,
          relations: parseRelations(req.body.relations),
        },
        req.user.user_id,
      );
      res.status(201).json(article);
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Article slug already exists." });
      }
      res.status(400).json({
        error: err.message || "Failed to create knowledge-base article.",
      });
    }
  },
);

router.put(
  "/:id",
  requireAuth,
  [
    body("status")
      .optional()
      .isIn(ARTICLE_STATUSES)
      .withMessage("Invalid article status"),
    body("visibility_scope")
      .optional()
      .isIn(ARTICLE_VISIBILITY_SCOPES)
      .withMessage("Invalid visibility scope"),
  ],
  async (req, res) => {
    if (!canManageKnowledgeBase(req.user)) {
      return res.status(403).json({
        error: "You do not have permission to update knowledge-base articles.",
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const article = await updateKnowledgeBaseArticle(
        Number(req.params.id),
        {
          ...req.body,
          relations: parseRelations(req.body.relations),
        },
        req.user.user_id,
      );
      if (!article) {
        return res
          .status(404)
          .json({ error: "Knowledge-base article not found." });
      }
      res.json(article);
    } catch (err) {
      console.error(err);
      if (err.code === "23505") {
        return res.status(409).json({ error: "Article slug already exists." });
      }
      res.status(400).json({
        error: err.message || "Failed to update knowledge-base article.",
      });
    }
  },
);

router.get("/:id/revisions", requireAuth, async (req, res) => {
  try {
    const article = await buildKnowledgeArticleDetail(
      pool,
      Number(req.params.id),
    );
    if (!article) {
      return res
        .status(404)
        .json({ error: "Knowledge-base article not found." });
    }
    if (!canViewKnowledgeBaseArticle(req.user, article)) {
      return res
        .status(403)
        .json({ error: "You do not have permission to view this article." });
    }
    res.json(article.revisions || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load article revisions." });
  }
});

router.post(
  "/:id/feedback",
  requireAuth,
  [
    body("is_helpful")
      .isBoolean()
      .withMessage("Feedback helpful flag is required"),
  ],
  async (req, res) => {
    if (!canProvideKnowledgeBaseFeedback(req.user)) {
      return res.status(403).json({
        error: "You do not have permission to submit knowledge-base feedback.",
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const article = await loadKnowledgeArticle(pool, Number(req.params.id));
      if (!article) {
        return res
          .status(404)
          .json({ error: "Knowledge-base article not found." });
      }
      if (!canViewKnowledgeBaseArticle(req.user, article)) {
        return res.status(403).json({
          error:
            "You do not have permission to provide feedback for this article.",
        });
      }

      const detail = await addKnowledgeBaseFeedback(
        req.params.id,
        req.body,
        req.user.user_id,
      );
      res.status(201).json(detail.feedback_summary);
    } catch (err) {
      console.error(err);
      res.status(400).json({
        error: err.message || "Failed to submit knowledge-base feedback.",
      });
    }
  },
);

module.exports = router;
