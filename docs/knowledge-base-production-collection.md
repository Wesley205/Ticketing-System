# Production Knowledge Base Collection

Reviewed: 8 October 2026. Dataset: `database/knowledge-base.production.json`.

## Research And Scope

This is a curated set of 30 common workplace ICT support topics, not a statistical
ranking of the 30 most popular faults in Nigeria. No credible national ranking
covering all workplace faults was established. NCC's [consumer complaint data](https://www.ncc.gov.ng/market-data-reports/consumer-complaint-statistics)
describes telecommunications complaints, not computer, printer and application
help-desk incidence. Local ticket statistics should eventually determine ordering.

Nigeria-specific relevance includes mobile connectivity, limited data bundles and
provider escalation. NCC's [data-usage guidance](https://ncc.gov.ng/frequently-asked-questions/causes-data-consumptionusagedepletion)
and [complaint-resolution guide](https://consumer.ncc.gov.ng/articles/115-telecom-complaint-resolution-a-step-by-step-guide)
inform those entries. The newer complaint guide uses customer-care number 300;
older FAQ pages still list legacy numbers. The collection links the current guide
rather than repeating inconsistent short codes.

Resolution steps are concise paraphrases of official Microsoft, Google, Dell and
HP instructions, with source URLs recorded per article and included in the stored
body. Safety restrictions, organisational-policy checks, verification and ICT
escalation language are editorial additions, not claimed vendor quotations.
Steps have been checked against documentation, not tested on every device model.
Microsoft Entra recovery articles explicitly do not apply to NSC app passwords.

## Images

No generated pictures, stock placeholders or fabricated screenshots are included.
These first-line procedures do not require an image to perform the safe checks.
Users can consult the illustrated vendor guide from the recorded source address.

[Microsoft's screenshot-use guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/copyright/permissions)
prohibit putting its screenshots in a product user interface. HP and Dell device
images should not be copied without verified reuse permission or passed off as
universal hardware instructions. The paper-jam entry therefore sends users to
their exact printer model's guide and escalates disassembly to ICT. A future
gallery can use actual NSC equipment photos taken with permission, with device
model, caption and alt text, and no visible personal or confidential information.

## Included Topics

1. Wi-Fi with no internet
2. Ethernet connectivity
3. Android mobile-data failure
4. Approved mobile hotspot connection
5. Data bundle depletion
6. Slow computer
7. Low storage
8. Windows update failures
9. Computer with no power
10. Slow laptop charging
11. Overheating and shutdowns
12. Blank screen
13. Windows stop-code crashes
14. Offline printer
15. Stuck print queue
16. Paper jams
17. Keyboard and mouse failure
18. Bluetooth pairing
19. No sound
20. Microphone problems
21. Camera problems
22. Chrome crashes
23. Browser clock and certificate warnings
24. Browser notification permissions
25. Outlook send/receive problems
26. OneDrive sync problems
27. Microsoft work-account password recovery
28. Microsoft multifactor-verification failures
29. Phishing reports
30. Malware alerts

## Import And Verification

The existing five-article development seed is unchanged. This collection is
separate, uses `prod-` slugs, and never deletes existing articles or media.
The importer uses a single transaction and advisory lock, publishes under an
active administrator, records initial revisions and canonical ticket-category
relations, then verifies the stored fields, revisions and relations before commit.
Repeating an identical import makes no changes. A collision with an edited article
rolls back the entire import rather than overwriting the editor's work.

From `backend`, with the intended database credentials configured securely:

```powershell
npm run seed:knowledge-base:production -- --validate
node test/productionKnowledgeBaseSeed.test.js
npm run seed:knowledge-base:production -- --apply
npm run seed:knowledge-base:production -- --verify
```

`--validate` does not connect to a database. `--verify` is read-only. Production
credentials must be loaded from the linked environment, never copied into this
document or committed. Confirm the target database before `--apply`.

Publication is a data-only update: the existing app can read these articles
without a Vercel rebuild. Refresh the Knowledge Base after importing. Any future
changes to renderer or API behaviour need their own tests and deployment.

Review sources at least quarterly and after vendor interface changes. Keep
device-specific repair, account administration and security bypass instructions
out of public-facing self-service entries. Collect article feedback and resolved
ticket links to replace assumed relevance with actual NSC usage evidence.

## Production Import Record

Imported on 8 October 2026 into the existing Neon database linked to
`nsc-ict-system.vercel.app`. Before import: 0 articles and 0 active article images.
Result: 30 new published articles; no existing content was deleted or replaced.

Independent post-commit verification checked all 30 article bodies, metadata,
current revision bodies and ticket-category relations against the reviewed seed.
The application's repository returned 30 published articles, 5 Network category
matches and 3 printer search matches. Vercel's `/api/health/readiness` returned
HTTP 200 with `ready: true`. An authenticated browser session was not used to
visually inspect the live article reader during this import.

Categories: Account access 2; Hardware and devices 9; Network issues 5;
Printers 3; Security steps 3; Software and apps 8.

Verification: 280 backend tests passed, including 5 dedicated production-seed
tests for content validation, unsafe sources, idempotency, edited-content
protection and missing revisions/relations. No static-analysis commands were run.
