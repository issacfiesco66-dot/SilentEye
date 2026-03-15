import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts, getPostBySlug, getAllSlugs } from '@/lib/blog-posts';
import JsonLd from '@/components/JsonLd';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://silenteye.mx/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url: `https://silenteye.mx/blog/${post.slug}`,
      publishedTime: post.date,
      authors: ['SilentEye'],
      tags: [post.keyword, 'GPS', 'rastreo vehicular', 'seguridad'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeader: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-2 my-4">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[15px] text-zinc-600 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-6">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr>
                {tableHeader.map((h, i) => (
                  <th key={i} className="text-left py-2.5 px-3 bg-zinc-100 font-bold text-zinc-700 border-b border-zinc-200 first:rounded-tl-lg last:rounded-tr-lg">
                    {h.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2.5 px-3 text-zinc-600">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      tableHeader = [];
      inTable = false;
    }
  };

  const inlineFormat = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.split('|').filter(c => c.trim() !== '');
      if (!inTable) {
        tableHeader = cells;
        inTable = true;
      } else if (cells.every(c => /^[-:\s]+$/.test(c.trim()))) {
        continue; // separator row
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headers
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight mt-10 mb-4">
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-lg font-bold text-zinc-900 mt-8 mb-3">
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    // List items
    if (trimmed.startsWith('- ')) {
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      inList = true;
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={i} className="text-[15px] text-zinc-600 leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
    );
  }

  flushList();
  flushTable();

  return elements;
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const currentIndex = blogPosts.findIndex(p => p.slug === post.slug);
  const related = blogPosts.filter((_, i) => i !== currentIndex).slice(0, 3);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: 'SilentEye', url: 'https://silenteye.mx' },
    publisher: {
      '@type': 'Organization',
      name: 'SilentEye',
      url: 'https://silenteye.mx',
      logo: { '@type': 'ImageObject', url: 'https://silenteye.mx/icon-512.png' },
    },
    mainEntityOfPage: `https://silenteye.mx/blog/${post.slug}`,
    keywords: [post.keyword, 'GPS', 'rastreo vehicular', 'rastreo GPS', 'seguridad vehicular', 'plataforma GPS'],
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://silenteye.mx' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://silenteye.mx/blog' },
      { '@type': 'ListItem', position: 3, name: post.title, item: `https://silenteye.mx/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
              ← Blog
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Acceder
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <article className="px-6 pt-12 pb-16 md:pt-20">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[12px] text-zinc-400 mb-8">
            <Link href="/" className="hover:text-zinc-600 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-zinc-600 transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-zinc-600 truncate max-w-[200px]">{post.title.split(':')[0]}</span>
          </nav>

          {/* Meta */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700">
              {post.category}
            </span>
            <span className="text-[12px] text-zinc-400">{post.readTime} de lectura</span>
            <span className="text-[12px] text-zinc-400">
              {new Date(post.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-4 leading-tight">
            {post.title}
          </h1>
          <p className="text-lg text-zinc-500 leading-relaxed mb-10">{post.description}</p>

          <hr className="border-zinc-100 mb-10" />

          {/* Content */}
          <div className="prose-silent">
            {renderMarkdown(post.content)}
          </div>

          {/* CTA */}
          <div className="mt-12 bg-zinc-900 text-white rounded-xl px-6 py-8 md:px-8">
            <h3 className="font-bold text-lg mb-2">¿Listo para proteger tu vehículo?</h3>
            <p className="text-zinc-400 text-[14px] mb-4">Conecta tu GPS a SilentEye y activa alertas automáticas, rastreo en tiempo real y coordinación de respuesta.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors">
                Crear cuenta gratis
              </Link>
              <Link href="/sos" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-400 bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                Emergencia SOS
              </Link>
            </div>
          </div>
        </div>
      </article>

      {/* Related posts */}
      <section className="px-6 pb-24 border-t border-zinc-100 pt-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-extrabold tracking-tight mb-8">Artículos relacionados</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="group">
                <article className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 hover:border-blue-200 transition-all h-full flex flex-col">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">{r.category}</span>
                  <h3 className="font-bold text-zinc-900 text-[15px] leading-snug mb-2 group-hover:text-blue-600 transition-colors">{r.title}</h3>
                  <p className="text-[12px] text-zinc-500 leading-relaxed flex-1">{r.description}</p>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold tracking-tight">SilentEye</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/privacidad" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Privacidad</Link>
            <Link href="/cookies" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Cookies</Link>
            <Link href="/terminos" className="text-[12px] text-zinc-400 hover:text-zinc-600 transition-colors">Términos</Link>
            <span className="text-[12px] text-zinc-300">SilentEye &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
