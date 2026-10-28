# Data Model: Profile Menu Consolidation

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-11

No database entities, fields, or relationships change. This feature (spec
Assumptions) is UI-reorganization plus one server-side route guard; the `Profile`
entity, its fields, and session mechanics are all reused unchanged from
`001-user-auth`.

## Header nav state (client-rendered, not persisted)

Not a data entity — documented here only because it is the one piece of "shape" this
feature changes. `renderHeader()` in `src/public/app.js` already branches on whether
`/api/me` returned a user; this feature only moves where two items render within the
signed-in branch:

| State | Before (001-user-auth) | After (this feature) |
|---|---|---|
| Signed-in header nav | `Edit Profile`, `Logout`, then avatar+menu (menu: `Edit Profile`) | avatar+menu only (menu: `Edit Profile`, `Logout`) |
| Signed-in avatar menu | `Edit Profile` | `Edit Profile`, `Logout` |
| Signed-out header nav | `Login`, (`Create Account` if native) | unchanged |

No new fields, no new client-side state variables — `menu.hidden` toggle logic is
reused as-is (FR-007).
