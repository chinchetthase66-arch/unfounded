---
name: github-pages-deploy
description: >-
  Guides zero-error QA verification, cloud sync configuration, and deployment to GitHub Pages
  (github.io) at https://github.com/chinchetthase66-arch/unfounded.git.
---

# GitHub Pages Deployment & Zero-Error QA Skill

Use this skill when preparing, verifying, and deploying the application to `https://github.com/chinchetthase66-arch/unfounded.git`.

## 1. GitHub Pages Compatibility Rules
1. **Relative Paths Only:**
   - Because GitHub Pages serves project sites under `/unfounded/` (`https://chinchetthase66-arch.github.io/unfounded/`), all asset paths MUST be relative (`./387004.jpg`, `./QR Code.jpg`, `./tickets.html`), never root-relative (`/387004.jpg`).
2. **No Jekyll Interference:**
   - Always include an empty `.nojekyll` file in the root directory so GitHub Pages serves all static files without Jekyll processing delays or underscore filtering.
3. **Cloud Database + Local Fallback Architecture:**
   - Support instant zero-config operation out-of-the-box PLUS real-time Cloud Database sync (Supabase REST / Firebase Realtime Database) configurable directly from the Admin Settings modal or config file so customer bookings from any phone sync to the Admin Dashboard in real time.

## 2. Pre-Deployment 100% Zero-Bug Checklist
- [ ] All 6 workspace images load with HTTP 200 and proper URL encoding:
  - `./387004.jpg`
  - `./384855_0.jpg`
  - `./384856_0.jpg`
  - `./QR Code.jpg`
  - `./บอลลูนตาหมากรุกเหนือทุ่งยามอาทิตย์อัสดง.png`
  - `./บอลลูนวัวยักษ์เหนือนาทุ่ง.png`
- [ ] Zero JavaScript console errors or warnings.
- [ ] Customer booking flow, E-Ticket lookup, Manual Balloon Ticket A4 printing, and Admin Report all tested end-to-end.
