import type { Metadata } from 'next';
import Link from 'next/link';
import { blogPosts } from '@/lib/blog-posts';
import JsonLd, { getBlogIndexJsonLd, getBreadcrumbJsonLd, getWebPageJsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Blog — GPS, Rastreo Vehicular y Seguridad | SilentEye',
  description:
    'Guías, tutoriales y comparativas sobre GPS para autos, motos, camiones, trailers y flotillas. Aprende sobre rastreo GPS en tiempo real, geocercas, recuperación vehicular y seguridad.',
  alternates: { canonical: 'https://silenteye.mx/blog' },
};

const categoryColors: Record<string, string> = {
  'Guías': 'bg-blue-50 text-blue-700',
  'Tutoriales': 'bg-emerald-50 text-emerald-700',
  'Comparativas': 'bg-violet-50 text-violet-700',
  'Educación': 'bg-amber-50 text-amber-700',
  'Seguridad': 'bg-red-50 text-red-700',
};

export default function BlogPage() {
  const featured = blogPosts[0];
  const rest = blogPosts.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={getWebPageJsonLd({
        name: 'Blog de SilentEye — GPS, rastreo vehicular y seguridad',
        description: 'Guías, tutoriales y comparativas sobre GPS para autos, motos, camiones, trailers y flotillas en México.',
        url: 'https://silenteye.mx/blog',
      })} />
      <JsonLd data={getBlogIndexJsonLd(blogPosts.map((p) => ({
        slug: p.slug,
        title: p.title,
        description: p.description,
        date: p.date,
        category: p.category,
      })))} />
      <JsonLd data={getBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://silenteye.mx' },
        { name: 'Blog', url: 'https://silenteye.mx/blog' },
      ])} />
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SilentEye</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-500">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Inicio</Link>
            <Link href="/blog" className="text-zinc-900">Blog</Link>
            <Link href="/#faq" className="hover:text-zinc-900 transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sos" className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              SOS
            </Link>
            <Link href="/login" className="px-4 py-1.5 text-[13px] font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors">
              Acceder
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="px-6 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[13px] font-semibold text-blue-600 tracking-wide uppercase mb-3">Blog de SilentEye</p>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">GPS, rastreo vehicular y seguridad</h1>
          <p className="text-zinc-500 text-lg max-w-2xl">Guías, tutoriales y comparativas para proteger tu auto, moto, camión o flotilla con GPS y rastreo en tiempo real.</p>
        </div>
      </header>

      {/* Featured post */}
      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <Link href={`/blog/${featured.slug}`} className="block group">
            <div className="bg-zinc-900 rounded-2xl p-8 md:p-12 hover:bg-zinc-800 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-white/10 text-white`}>
                  {featured.category}
                </span>
                <span className="text-[12px] text-zinc-400">{featured.readTime} de lectura</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3 group-hover:text-blue-400 transition-colors">
                {featured.title}
              </h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed max-w-2xl mb-4">{featured.description}</p>
              <span className="text-blue-400 text-[13px] font-semibold flex items-center gap-1">
                Leer artículo
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Posts grid */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <article className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 hover:border-blue-200 hover:shadow-sm transition-all h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${categoryColors[post.category] || 'bg-zinc-100 text-zinc-600'}`}>
                      {post.category}
                    </span>
                    <span className="text-[12px] text-zinc-400">{post.readTime}</span>
                  </div>
                  <h2 className="font-bold text-zinc-900 text-[16px] leading-snug mb-2 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-[13px] text-zinc-500 leading-relaxed flex-1">{post.description}</p>
                  <span className="text-blue-600 text-[13px] font-semibold mt-4 flex items-center gap-1">
                    Leer más
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-900 text-white rounded-2xl px-8 py-12 md:px-12 text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">¿Listo para proteger tu vehículo?</h2>
            <p className="text-zinc-400 text-[15px] mb-6 max-w-lg mx-auto">Conecta tu GPS a SilentEye y transforma un rastreador básico en un sistema de respuesta inmediata.</p>
            <div className="flex justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-900 bg-white rounded-lg hover:bg-zinc-100 transition-colors">
                Crear cuenta
              </Link>
              <Link href="/sos" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-red-400 bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                Emergencia SOS
              </Link>
            </div>
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
