# Secure Internal Access

## Scope

Phase 2 implements internal-only account access for the current Node.js/Express prototype.

## Delivered changes

- Public registration disabled at `POST /api/auth/register`
- Login page no longer links to self-registration
- `/register.html` repurposed as invitation acceptance
- New invitation workflow at `/api/invitations`
- Employee email-domain validation driven by `ORGANIZATION_EMAIL_DOMAINS`
- New `user_type`, sponsor, start-date, expiry-date, and lifecycle fields on `users`
- New `invitations` table for approved onboarding
- Automatic login blocking for inactive, not-yet-active, and expired accounts
- Scheduled temporary-account expiry sweep via server interval and `npm run expire-accounts`
- Migration runner via `npm run migrate`
- Unit tests for auth policy, invitations, and account-expiry logic

## Migration and rollout

1. Back up the current database.
2. Run the base schema if provisioning a new environment.
3. Run `npm run migrate` from `backend/`.
4. Confirm `ORGANIZATION_EMAIL_DOMAINS`, `JWT_SECRET`, and `INTERNAL_APP_BASE_URL`.
5. Have an administrator issue invitations for new users.

## Operational notes

- Invitation links are shown once to the administrator after creation because no mail provider exists in the current repository.
- Temporary-user access now depends on sponsor information and an account expiration date.
- Existing JWTs are revalidated against live user state on each authenticated request.
