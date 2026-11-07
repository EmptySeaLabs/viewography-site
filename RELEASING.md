# Updating the public release

1. Confirm the version and build actually available on the App Store before updating the current-release card.
2. Update the current card and release notes in whats-new.html. Public releases use the App Store download link; beta invitations belong in a separate, clearly labeled testing flow.
3. Move previous releases into Previous builds, preserving historical beta labels.
4. Copy whats-new.html to whats-new/index.html so both routes match.
5. Keep each route’s canonical URL consistent with sitemap.xml.
6. Check desktop and phone layouts, keyboard navigation, and the exact App Store destination before merging.
7. When pricing or compatibility changes, update the homepage, FAQ, structured data, social image and App Store copy together.

## Marketing assets

APP_STORE_COPY.md contains proposed listing copy and the screenshot brief. It is a review draft, not a record of changes published in App Store Connect.

The homepage’s Planner image is bundled at assets/streaming-plan.webp, recovered from the released App Store page. It is a 156 × 340 thumbnail; replace it with a full-resolution original export when available. The standalone preview embeds the image so it works without external image requests.
