import React, { useEffect, useMemo, useState } from 'react';
import PhotoAlbum, { Photo } from 'react-photo-album';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

import { Album, getRawImages, groupIntoAlbums, measureImages, PhotoItem } from './albums';
import { pickQuote } from './quotes';
import { themeForPath, gradientCss, photoOverlayCss, setRuntimeBrand, setRuntimeThemes } from './theme';

type ViewMode = 'stream' | 'by-album' | 'all';

export default function App() {
  const [items, setItems] = useState<PhotoItem[] | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [view, setView] = useState<ViewMode>('stream');
  const [query, setQuery] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [lightboxSlides, setLightboxSlides] = useState<{ src: string }[]>([]);
  const [shuffleTick, setShuffleTick] = useState(0);
  // Quote frequency controller: -1 random (legacy), 0 none, N => 1 quote per N images
  const [quoteEveryN, setQuoteEveryN] = useState<number>(2);
  // Theme editor
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [brandColor, setBrandColor] = useState<string>('#4f46e5');
  const [themeOverrides, setThemeOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const raws = getRawImages();
    measureImages(raws).then(measured => {
      setItems(measured);
      setAlbums(groupIntoAlbums(measured));
    });
  }, []);

  // Apply runtime themes when overrides change
  useEffect(() => {
    setRuntimeBrand({ color: brandColor });
    const mapped = Object.fromEntries(Object.entries(themeOverrides).map(([k, v]) => [k, { color: v }]));
    setRuntimeThemes(mapped);
  }, [brandColor, themeOverrides]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => it.path.toLowerCase().includes(q));
  }, [items, query]);

  // Build slides for lightbox from current filtered set
  useEffect(() => {
    if (!filtered) return;
    setLightboxSlides(filtered.map(f => ({ src: f.src })));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="m-0 text-xl md:text-2xl font-semibold">Memory Photo Album</h1>
          <div className="muted text-xs">A living stream of quotes and photos</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input w-64 max-w-full"
            type="search"
            placeholder="Search path or filename…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select className="input" value={view} onChange={e => setView(e.target.value as ViewMode)}>
            <option value="stream">Mixed stream</option>
            <option value="by-album">Browse albums</option>
            <option value="all">All photos</option>
          </select>
          {view === 'stream' && (
            <>
              <label className="muted text-xs">Quotes:</label>
              <select className="input" value={quoteEveryN} onChange={e => setQuoteEveryN(Number(e.target.value))}>
                <option value={0}>Off</option>
                <option value={3}>1 per 3 images</option>
                <option value={2}>1 per 2 images</option>
                <option value={1}>1 per image</option>
                <option value={-1}>Random</option>
              </select>
              <button className="btn" onClick={() => setShuffleTick(t => t + 1)}>Shuffle</button>
            </>
          )}
          <button className="btn" onClick={() => setShowThemeEditor(s => !s)}>{showThemeEditor ? 'Close Themes' : 'Themes'}</button>
        </div>
      </header>

      {showThemeEditor && (
        <ThemeEditor
          albums={albums}
          brandColor={brandColor}
          setBrandColor={setBrandColor}
          themeOverrides={themeOverrides}
          setThemeOverrides={setThemeOverrides}
        />
      )}

      {!items && <p>Loading images…</p>}

      {items && view === 'stream' && (
        <MixedStream photos={filtered ?? items} onOpen={setLightboxIndex} shuffleTick={shuffleTick} quoteEveryN={quoteEveryN} />
      )}

      {items && view === 'all' && (
        <div className="card p-4 md:p-6 mt-4">
          <h3 className="flex items-baseline gap-2 m-0 mb-3 text-lg font-semibold">All Photos <span className="muted text-xs">images/**/*</span></h3>
          <MemoryCard from={items} title="All photos" themePath={''} />
          <Gallery photos={filtered ?? []} onOpen={setLightboxIndex} />
        </div>
      )}

      {items && view === 'by-album' && (
        <div className="grid gap-6 mt-4">
          {albums.map(album => {
            const theme = themeForPath(album.path);
            return (
            <section className="card p-4 md:p-6" key={album.key}>
              <h3 className="flex items-center gap-2 m-0 mb-3 text-lg font-semibold">
                {titleCase(album.title)}
                <span className="muted text-xs">{album.path}</span>
                <span className={`inline-block w-4 h-4 rounded-sm ring-1 ring-white/20`} style={{ backgroundImage: gradientCss(theme) }} title="Theme preview" />
              </h3>
              <MemoryCard from={album.items} title={album.title} themePath={album.path} />
              <Gallery
                photos={(filtered ?? items).filter(p => p.path.startsWith(album.path + '/'))}
                onOpen={setLightboxIndex}
                indexFor={(photo, _i) => (filtered ?? items).indexOf(photo)}
              />
            </section>
          );})}
        </div>
      )}

      <Lightbox open={lightboxIndex >= 0} close={() => setLightboxIndex(-1)} index={lightboxIndex} slides={lightboxSlides} />
    </div>
  );
}

function Gallery({ photos, onOpen, indexFor }: { photos: PhotoItem[]; onOpen: (i: number) => void; indexFor?: (photo: PhotoItem, localIndex: number) => number }) {
  // Use title to carry repo path; alt remains the file name
  // Use thumbnails for the grid; full-size for the lightbox
  const photoData: Photo[] = photos.map(p => ({ src: (p as any).thumbSrc ?? p.src, width: p.width, height: p.height, alt: p.file, title: p.path }));
  return (
    <PhotoAlbum
      layout="rows"
      photos={photoData}
      targetRowHeight={typeof window !== 'undefined' && window.innerWidth < 480 ? 180 : 260}
      spacing={6}
      onClick={({ index }) => {
        const globalIndex = indexFor ? indexFor(photos[index], index) : index;
        if (globalIndex >= 0) onOpen(globalIndex);
      }}
      renderPhoto={({ imageProps, wrapperStyle, photo }) => {
        const path = (photo.title as string) || '';
        const theme = themeForPath(path);
        return (
          <div style={{ ...wrapperStyle, position: 'relative' }} className="relative overflow-hidden">
            <img
              {...imageProps}
              loading="lazy"
              decoding="async"
              className={(imageProps.className ?? '') + ' block'}
              style={{
                ...imageProps.style,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <div className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: photoOverlayCss(theme) }} />
          </div>
        );
      }}
    />
  );
}

function MemoryCard({ from, title, themePath }: { from: PhotoItem[]; title: string; themePath?: string }) {
  const first = from[0];
  const loc = guessLocation(first);
  const when = guessDate(first?.file);
  const q = pickQuote(title + '|' + (loc ?? ''), { location: loc ?? undefined, when: when ?? undefined });
  const theme = themeForPath(themePath ?? first?.path);
  return (
    <div className={`prose prose-invert prose-slate max-w-none rounded-lg p-3 md:p-4 ring-1 ring-white/10`} style={{ backgroundImage: gradientCss(theme) }}>
      <p className="m-0 leading-snug">“{q.text}”</p>
      <p className="m-0 text-xs text-slate-200/90">{q.author ? `— ${q.author}` : ''}</p>
    </div>
  );
}

function guessLocation(p?: PhotoItem): string | null {
  if (!p) return null;
  // prefer folder name; fallback to parts of filename
  const folder = p.path.split('/').slice(-2, -1)[0];
  return folder?.replace(/[-_]+/g, ' ') ?? null;
}

function guessDate(filename?: string): string | null {
  if (!filename) return null;
  // Match YYYYMMDD at start
  const m = filename.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) {
    const [_, y, mo, d] = m;
    return `${y}-${mo}-${d}`;
  }
  // Or a 13-digit epoch-like prefix
  const m2 = filename.match(/^(\d{13})/);
  if (m2) {
    const t = new Date(Number(m2[1]));
    if (!isNaN(t.getTime())) return t.toISOString().slice(0, 10);
  }
  return null;
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, c => c.toUpperCase());
}

function guessLocationFromPath(path: string): string | null {
  const folder = path.split('/').slice(-2, -1)[0];
  return folder?.replace(/[-_]+/g, ' ') ?? null;
}

type StreamItem =
  | { kind: 'photo'; idx: number; src: string; file: string; path: string }
  | { kind: 'quote'; text: string; author?: string; contextPath?: string };

function MixedStream({ photos, onOpen, shuffleTick, quoteEveryN }: { photos: PhotoItem[]; onOpen: (i: number) => void; shuffleTick: number; quoteEveryN: number }) {
  const stream = useMemo<StreamItem[]>(() => {
    // Start from a shuffled list of photos
    const photoTiles: Extract<StreamItem, { kind: 'photo' }>[] = photos.map((p, idx) => ({ kind: 'photo', idx, src: p.src, file: p.file, path: p.path }));
    shuffleInPlace(photoTiles);

    // Build a mixed stream: insert quotes controlled by quoteEveryN
    const out: StreamItem[] = [];
    let sinceLastQuote = 0;
    // If random (-1), vary 1-3; if fixed (>0), use that gap; if off (0), never insert
    const nextGapRandom = () => rand(1, 3);
    let nextGap = quoteEveryN === -1 ? nextGapRandom() : Math.max(quoteEveryN, 1);
    for (const tile of photoTiles) {
      out.push(tile);
      sinceLastQuote++;
      if (quoteEveryN === 0) continue; // never insert
      const obey = quoteEveryN === -1 ? Math.random() < 0.9 : true; // random mode keeps some irregularity
      const shouldInsert = sinceLastQuote >= nextGap && obey;
      if (shouldInsert) {
        const q = pickQuote(tile.path, { location: guessLocationFromPath(tile.path) ?? undefined, when: undefined });
        out.push({ kind: 'quote', text: q.text, author: q.author, contextPath: tile.path });
        sinceLastQuote = 0;
        nextGap = quoteEveryN === -1 ? nextGapRandom() : Math.max(quoteEveryN, 1);
      }
    }
    // Optionally end with a quote (only in random mode)
    if (quoteEveryN === -1 && out.length && out[out.length - 1].kind !== 'quote' && Math.random() < 0.3) {
      const last = out[out.length - 1] as Extract<StreamItem, { kind: 'photo' }>;
      const q = pickQuote(last.path, { location: guessLocationFromPath(last.path) ?? undefined, when: undefined });
      out.push({ kind: 'quote', text: q.text, author: q.author, contextPath: last.path });
    }
    // Avoid double quotes
    for (let i = 1; i < out.length; i++) {
      if (out[i].kind === 'quote' && out[i - 1].kind === 'quote') {
        out.splice(i, 1);
        i--;
      }
    }
    return out;
  }, [photos, shuffleTick, quoteEveryN]);

  return (
    <div className="grid gap-4 md:gap-6 mt-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {stream.map((item, i) => item.kind === 'photo'
        ? <PhotoTile key={'p:' + item.path + ':' + i} item={item} onOpen={onOpen} />
        : <QuoteTile key={'q:' + i} item={item} />
      )}
    </div>
  );
}

function PhotoTile({ item, onOpen }: { item: Extract<StreamItem, { kind: 'photo' }>; onOpen: (i: number) => void }) {
  const wide = Math.random() < 0.22; // sometimes span wider
  const aspects = ['aspect-[4/3]', 'aspect-square', 'aspect-[3/4]', 'aspect-[16/10]'] as const;
  const aspect = aspects[Math.floor(Math.random() * aspects.length)];
  const theme = themeForPath(item.path);
  return (
    <button onClick={() => onOpen(item.idx)} className={`group relative w-full overflow-hidden rounded-2xl ring-1 ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${wide ? 'lg:col-span-2' : ''}`}>
      <img src={item.src} alt={item.file} className="absolute inset-0 h-full w-full object-cover scale-105 transition-transform duration-500 group-hover:scale-110" />
      <div className={`relative ${aspect}`}>
        <div className="absolute inset-0" style={{ backgroundImage: photoOverlayCss(theme) }} />
        <div className="absolute inset-0 p-4 md:p-6 flex flex-col justify-end">
          <span className="mt-2 text-[10px] md:text-xs text-slate-300/80 truncate drop-shadow">{item.path}</span>
        </div>
      </div>
    </button>
  );
}

function QuoteTile({ item }: { item: Extract<StreamItem, { kind: 'quote' }> }) {
  const wide = Math.random() < 0.18;
  const tall = !wide && Math.random() < 0.4;
  const aspect = wide ? 'aspect-[16/9]' : tall ? 'aspect-[4/5]' : 'aspect-[5/4]';
  const theme = themeForPath(item.contextPath);
  return (
    <div className={`relative rounded-2xl ring-1 ring-white/10 ${wide ? 'lg:col-span-2' : ''}`} style={{ backgroundImage: gradientCss(theme) }}>
      <div className={`flex items-center justify-center p-6 md:p-10 ${aspect}`}>
        <div className="text-center max-w-2xl">
          <div className="text-xl md:text-3xl font-semibold leading-tight">“{item.text}”</div>
          {item.author && <div className="mt-2 text-xs md:text-sm text-slate-200/90">— {item.author}</div>}
        </div>
      </div>
    </div>
  );
}

function ThemeEditor({ albums, brandColor, setBrandColor, themeOverrides, setThemeOverrides }: {
  albums: Album[];
  brandColor: string;
  setBrandColor: (v: string) => void;
  themeOverrides: Record<string, string>;
  setThemeOverrides: (v: Record<string, string>) => void;
}) {
  const uniquePaths = useMemo(() => Array.from(new Set(albums.map(a => a.path))).sort(), [albums]);

  function updateFolder(path: string, value: string) {
    setThemeOverrides({ ...themeOverrides, [path]: value });
  }

  return (
    <section className="card p-4 md:p-6 mt-4">
      <h3 className="m-0 mb-3 text-lg font-semibold">Theme Editor</h3>
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <span className="w-28 text-sm text-slate-300">Brand</span>
          <span className={`inline-block w-6 h-6 rounded ring-1 ring-white/20`} style={{ backgroundImage: gradientCss({ color: brandColor }) }} />
          <input type="color" className="w-10 h-8 p-0 bg-transparent" value={brandColor} onChange={e => setBrandColor(e.target.value)} />
        </div>
        <div className="mt-2 h-px bg-white/10" />
        {uniquePaths.map(p => {
          const currentCol = themeOverrides[p] ?? themeForPath(p).color;
          return (
            <div key={p} className="flex items-center gap-2">
              <span className="w-64 text-xs text-slate-400 truncate">{p}</span>
              <span className={`inline-block w-6 h-6 rounded ring-1 ring-white/20`} style={{ backgroundImage: gradientCss({ color: currentCol }) }} />
              <input type="color" className="w-10 h-8 p-0 bg-transparent" value={themeOverrides[p] ?? currentCol} onChange={e => updateFolder(p, e.target.value)} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
