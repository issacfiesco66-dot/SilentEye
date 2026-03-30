# GEO Audit Report: SilentEye

**Audit Date:** 2026-03-30
**URL:** https://silenteye.mx
**Business Type:** SaaS (GPS Vehicle Tracking Platform)
**Pages Analyzed:** 31 (8 static + 21 blog posts + /precios + /sos)

---

## Executive Summary

**Overall GEO Score: 50/100 (Poor)**

SilentEye has a strong technical foundation — server-side rendered with Next.js, proper security headers, comprehensive robots.txt with AI crawler directives, and a well-structured llms.txt. However, the site is severely held back by **near-zero external brand presence** (8/100) and **missing author/expertise signals** (52/100 E-E-A-T). The technical infrastructure is ready for AI discovery, but AI systems have no external signals to validate SilentEye as a trustworthy, citable entity.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 62/100 | 25% | 15.5 |
| Brand Authority | 8/100 | 20% | 1.6 |
| Content E-E-A-T | 52/100 | 20% | 10.4 |
| Technical GEO | 82/100 | 15% | 12.3 |
| Schema & Structured Data | 55/100 | 10% | 5.5 |
| Platform Optimization | 47/100 | 10% | 4.7 |
| **Overall GEO Score** | | | **50/100** |

---

## Critical Issues (Fix Immediately)

### 1. Zero Brand Presence on External Platforms (Brand: 8/100)
- **Impact:** AI models cannot verify SilentEye as a real entity. No LinkedIn, no YouTube, no Facebook, no Twitter/X, no Reddit mentions, no Wikipedia, no industry directory listings.
- **Fix:** Create profiles on LinkedIn (company page), YouTube (channel), Facebook (page), Twitter/X. Add all URLs to the `sameAs` array in Organization schema (`frontend/components/JsonLd.tsx`).

### 2. Empty `sameAs` in Organization Schema
- **Impact:** The `sameAs: []` array contains only GitHub. AI entity resolution cannot link SilentEye across platforms. This is the single most damaging gap for GEO.
- **Fix:** Populate with social media profile URLs once created.

### 3. No Named Author or Person Schema (E-E-A-T: 52/100)
- **Impact:** All content attributed to "SilentEye" as organization. Google Quality Rater Guidelines specifically look for identifiable content creators. AI models cannot verify author expertise.
- **Fix:** Create an About page at `/about` with founder name, credentials, photo. Add Person schema. Update blog posts to show individual author byline.

---

## High Priority Issues

### 4. No Customer Testimonials, Case Studies, or Operational Data
- Content reads as informed marketing, not evidence-based authority
- Zero proprietary metrics (vehicles monitored, alerts processed, recovery success rate)
- Fix: Publish 2-3 case studies with real (anonymized) data

### 5. No External Citations in Blog Posts
- Every blog post has 0 outbound links to authoritative sources
- Crime statistics mentioned but not linked to SESNSP, INEGI, or ANERPV
- Fix: Add 3-5 external links per blog post to authoritative sources

### 6. No Physical Address or Phone Number
- ContactPoint schema has email but no telephone
- Legal pages mention Puebla but no specific address
- Fix: Add phone number and address to contact info and schema

### 7. Blog Posts Missing Images
- All 21 blog posts are text-only with no images
- No platform screenshots, installation photos, or comparison graphics
- Fix: Add at least 1 image per blog post with descriptive alt text

---

## Medium Priority Issues

### 8. Repeated Phrases Across Content
- "sin central, sin llamada, sin espera" appears verbatim on every page
- "menos de 3 segundos" used identically across all content
- Creates AI content detection signals; reduce repetition

### 9. No Content Hub Structure
- All 21 blog posts are flat under /blog/ with no pillar page
- Fix: Create a hub page at /rastreo-gps-mexico linking all related content

### 10. Missing "Last Updated" Dates on Blog Posts
- No visible dateModified on blog pages (only datePublished)
- Fix: Add "Última actualización" text and keep dateModified in schema

### 11. No Review/Rating Schema
- SoftwareApplication has no AggregateRating
- No customer review markup anywhere
- Fix: Collect reviews and add AggregateRating schema

### 12. HSTS Preload Not Submitted
- HSTS header includes `preload` but domain may not be on hstspreload.org list
- Fix: Submit to https://hstspreload.org or remove `preload` directive

---

## Low Priority Issues

### 13. No ItemList schema on /blog index page
### 14. Legal pages (privacidad, cookies, terminos) have no structured data
### 15. SOS page has zero schema markup (client-side component)
### 16. Cookie SameSite=Lax could be Strict
### 17. No glossary of GPS tracking terminology

---

## Category Deep Dives

### AI Citability (62/100)
**Strengths:** FAQ with 12 well-formed Q&A pairs, comparison tables with specific pricing in MXN, step-by-step guides, specific device model recommendations. The llms.txt file is comprehensive with pricing, FAQ, and product sections.

**Weaknesses:** No proprietary data or statistics from SilentEye operations. Pricing was hidden (only on /precios, now added to llms.txt). No first-person experiential content. Blog posts follow identical formulaic structure.

### Brand Authority (8/100)
**Critical gap.** SilentEye has essentially zero presence on platforms that AI models use for entity validation:
- LinkedIn: No company page
- YouTube: No channel
- Wikipedia: No article
- Reddit: No mentions
- Trustpilot/G2/Capterra: No listings
- Product Hunt: Not launched
- Industry directories: Not registered

This is the #1 bottleneck. AI models rely heavily on cross-platform entity recognition.

### Content E-E-A-T (52/100)
- **Experience (10/25):** Specific product knowledge but no case studies or real outcomes
- **Expertise (9/25):** Technical accuracy but no named author with credentials
- **Authoritativeness (8/25):** No external validation, awards, or media coverage
- **Trustworthiness (22/25):** Excellent — LFPDPPP compliance, transparent data practices, honest disclaimers

### Technical GEO (82/100)
**Strongest category.** Next.js SSG delivers fully static HTML visible to all crawlers. Security headers properly configured (CSP, HSTS, X-Frame-Options). robots.txt allows all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.). URL structure is clean and semantic. HTTPS enforced. Canonical URLs present.

**Minor issues:** CSP allows `unsafe-inline` for scripts (needed for Next.js), blog posts lack images, og:image was missing (now fixed).

### Schema & Structured Data (55/100)
**After fixes applied today:**
- Organization: Fixed foundingDate, added sameAs with GitHub, ImageObject logo, email contact
- SoftwareApplication: Added image, availability, offers.url
- BlogPosting: Changed from Article, added speakable, articleSection, wordCount, keywords
- FAQPage: 12 Q&A pairs (restricted from rich results since Aug 2023 but valuable for AI)
- BreadcrumbList, Service, HowTo, WebSite: All present

**Still missing:** Person schema for author, AggregateRating, full sameAs links.

### Platform Optimization (47/100)
The site is technically ready for AI platforms but lacks the external signals they use:
- **Google AI Overviews:** Schema present, FAQ structured, but no E-E-A-T author signals
- **ChatGPT/Perplexity:** llms.txt present, crawler access allowed, but no brand mentions to validate
- **Bing Copilot:** Good structured data, but empty sameAs prevents entity linking

---

## Quick Wins (Implement This Week)

1. **Create LinkedIn company page** → add URL to sameAs in Organization schema (+10-15 GEO points)
2. **Create YouTube channel** with 1 product demo video → add to sameAs (+5-10 GEO points)
3. **Create Facebook and Twitter/X pages** → add to sameAs (+5 GEO points)
4. **Add author name to blog posts** with brief bio at bottom (+5 E-E-A-T points)
5. **Add 3-5 external links per blog post** to SESNSP, INEGI, manufacturer sites (+5 citability points)

## 30-Day Action Plan

### Week 1: External Presence (Biggest Impact)
- [ ] Create LinkedIn company page with full description
- [ ] Create YouTube channel, upload 1 platform demo video
- [ ] Create Facebook page and Twitter/X profile
- [ ] Update sameAs in Organization schema with all new URLs
- [ ] Register on Trustpilot and G2 (SaaS review platforms)
- [ ] Submit sitemap to Google Search Console

### Week 2: Author & E-E-A-T
- [ ] Create /about page with founder info, photo, credentials
- [ ] Add Person schema for author
- [ ] Update all blog posts to show individual author byline
- [ ] Add external citations (3-5 per post) to authoritative sources
- [ ] Write 1 first-person founder perspective blog post

### Week 3: Content Enrichment
- [ ] Add real platform screenshots to 5 key blog posts
- [ ] Publish 2 case studies with real (anonymized) operational data
- [ ] Create pillar page at /rastreo-gps-mexico
- [ ] Add "Last Updated" dates to all blog posts
- [ ] Diversify blog post structure (data analysis, tutorial, myth-busting)

### Week 4: Outreach & Validation
- [ ] Register in Mexican business directories (AMVO, Directorio Empresarial)
- [ ] Submit to Product Hunt
- [ ] Reach out to 3 Mexican automotive/security publications for guest post
- [ ] Post first YouTube video with GPS installation tutorial
- [ ] Submit domain to hstspreload.org

---

## Security Fixes Applied (This Session)

| Severity | Fix | File |
|---|---|---|
| CRITICAL | Removed OTP code from all API responses | routes.ts |
| CRITICAL | Enabled SSL certificate verification (rejectUnauthorized: true) | pool.ts |
| CRITICAL | Moved admin PII to environment variables | run-seed.ts |
| HIGH | Disabled /api/setup/otp in production | routes.ts |
| HIGH | Added SQL table name validation for TRUNCATE | routes.ts |
| MEDIUM | HTML-escaped user names in email templates | email-service.ts |
| LOW | Docker container runs as non-root user | Dockerfile |
| LOW | Process exits on uncaughtException | index.ts |

---

## SEO Content Deployed (This Session)

- **3 new blog posts:** chip GPS para auto, cómo rastrear auto robado, APN GPS tracker
- **20 new meta keywords** added to layout.tsx
- **llms.txt** enhanced with FAQ and pricing sections
- **Schema.org** fixes: BlogPosting, speakable, sameAs, ImageObject logo
- **OpenGraph** images added to all blog posts
- **Sitemap** dates fixed to use actual content dates

---

## Appendix: Pages Analyzed

| URL | Priority | GEO Issues |
|---|---|---|
| / | 1.0 | Missing author, no screenshots |
| /precios | 0.9 | No AggregateRating schema |
| /sos | 0.9 | Zero structured data (client component) |
| /blog | 0.9 | No ItemList schema |
| /login | 0.8 | N/A (auth page) |
| /blog/* (21 posts) | 0.7 | No images, no external links, no author byline |
| /privacidad | 0.3 | No WebPage schema |
| /terminos | 0.3 | No WebPage schema |
| /cookies | 0.2 | No WebPage schema |
