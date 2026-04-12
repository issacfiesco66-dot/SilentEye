'use client';

import { useEffect } from 'react';
import { useLocale } from '@/hooks/useLocale';

/**
 * Client-side component that updates document title and meta description
 * when the user switches locale. Static metadata in layout.tsx covers
 * crawlers (SSR); this handles the client-side SPA experience.
 */
export default function MetadataUpdater() {
  const { t, locale } = useLocale();

  useEffect(() => {
    document.title = t.seo.title;

    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t.seo.description);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', t.seo.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', t.seo.ogDescription);

    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', locale === 'en' ? 'en_US' : 'es_MX');

    const ogImgAlt = document.querySelector('meta[property="og:image:alt"]');
    if (ogImgAlt) ogImgAlt.setAttribute('content', t.seo.ogImageAlt);

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', t.seo.twitterTitle);

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.setAttribute('content', t.seo.twitterDescription);
  }, [t, locale]);

  return null;
}
