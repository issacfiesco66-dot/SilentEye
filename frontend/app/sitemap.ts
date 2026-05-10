import type { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/blog-posts';
import { competitors } from '@/lib/competitors';
import { stateRisk } from '@/lib/risk-zones';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://silenteye.mx';

  // Use the most recent blog post date as the "last updated" for dynamic pages
  const latestBlogDate = blogPosts.reduce((latest, p) => p.date > latest ? p.date : latest, '2026-01-01');

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: latestBlogDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: latestBlogDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparar`,
      lastModified: '2026-05-04',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparar/calculadora`,
      lastModified: '2026-05-04',
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/zonas-riesgo`,
      lastModified: '2026-05-04',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/socios`,
      lastModified: '2026-05-04',
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/precios`,
      lastModified: '2026-03-20',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rastreo-satelital-camiones`,
      lastModified: '2026-05-09',
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/cotizar-flota`,
      lastModified: '2026-05-09',
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: '2026-03-01',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sos`,
      lastModified: '2026-03-01',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: '2026-03-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/cookies`,
      lastModified: '2026-03-01',
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: '2026-03-01',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const compararPages: MetadataRoute.Sitemap = competitors.map((c) => ({
    url: `${baseUrl}/comparar/${c.slug}`,
    lastModified: '2026-05-04',
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const zonasRiesgoPages: MetadataRoute.Sitemap = stateRisk.map((s) => ({
    url: `${baseUrl}/zonas-riesgo/${s.slug}`,
    lastModified: '2026-05-04',
    changeFrequency: 'monthly' as const,
    // Higher-risk states get slightly higher priority — those have
    // more search demand ("GPS para auto en Estado de México").
    priority: s.risk_score >= 70 ? 0.8 : 0.7,
  }));

  return [...staticPages, ...blogPages, ...compararPages, ...zonasRiesgoPages];
}
