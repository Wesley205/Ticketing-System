# Knowledge Base Reader Improvements

The article list uses a constrained desktop column; filters stack safely and use
two secondary columns only when their panel has sufficient width. Article cards
use two-line summary previews, correct view plurals and an accessible selected
state. Security and visibility labels are simplified without changing stored
categories or permissions.

The reader removes a matching opening title from the body without editing stored
content. The summary becomes an introduction, last-reviewed information appears
under the title, and secondary metadata and revision history remain available.
Contents navigation collapses in narrow reader panels and becomes a side
navigation only when the panel has sufficient width. Source URLs are rendered as
escaped React text or credential-free HTTPS anchors, never raw HTML. New-window
links use `noopener noreferrer`.

Run from `frontend`:

```powershell
npm test
npm run build
npm run test:knowledge-base-reader
node src/test/knowledge-base-reader-review.mjs --screenshots
```

The screenshot option uses installed Windows Google Chrome and local fixtures,
not a live login or production credentials. It checks exact desktop/mobile
viewport widths and horizontal overflow, then writes screenshots into a unique
temporary directory for inspection. It requires a successful current build and
does not test API integration or authenticated production interactions.

Production CSS is used for screenshots, including Vite's stylesheet processing;
concatenating raw stylesheets is not an equivalent visual test. Deploy the rebuilt
frontend to Vercel separately to make these code changes visible on the live site.

Verification on 8 October 2026: all 79 frontend tests and the production build
passed. Reader rendering, role-specific status filters, safe source links,
singular view counts and title deduplication passed fixture checks. Headless
Chrome checks at 320px, 390px, 1440px and 1830px passed horizontal-overflow
assertions; mobile contents expanded successfully. Desktop and mobile
screenshots were visually inspected. These are fixture checks, not a live
authenticated production review.
