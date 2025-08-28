import React, { CSSProperties, useEffect, useRef, useState } from 'react';

// Simple global semaphore to limit concurrent image downloads
class LoaderQueue {
  private max: number;
  private active = 0;
  private q: Array<() => void> = [];
  constructor(max = 6) { this.max = max; }
  acquire(): Promise<() => void> {
    return new Promise(resolve => {
      const tryStart = () => {
        if (this.active < this.max) {
          this.active++;
          let released = false;
          resolve(() => {
            if (released) return;
            released = true;
            this.active = Math.max(0, this.active - 1);
            const next = this.q.shift();
            if (next) next();
          });
        } else {
          this.q.push(tryStart);
        }
      };
      tryStart();
    });
  }
}

export const loaderQueue = new LoaderQueue(6);

const TRANSPARENT_1PX =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

// Simple in-memory cache of srcs that have finished loading at least once.
// Helps avoid re-gating or re-intersecting images when switching views.
const loadedSrcs = new Set<string>();

type Props = {
  src: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  srcSet?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
  width?: number | string;
  height?: number | string;
  onClick?: React.MouseEventHandler<HTMLImageElement>;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export default function SmartImage({ src, alt, className, style, sizes, srcSet, fetchPriority = 'low', width, height, onClick, onLoad, onError }: Props) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [inView, setInView] = useState(false);
  const [canLoad, setCanLoad] = useState(false);
  const releaseRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let obs: IntersectionObserver | null = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
          }
        }
      },
      { root: null, rootMargin: '300px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => { obs && obs.disconnect(); obs = null; };
  }, []);

  useEffect(() => {
    // If we've already loaded this src before, skip gating/intersection and show immediately.
    if (loadedSrcs.has(src)) {
      setCanLoad(true);
      return;
    }
    if (!inView || canLoad) return;
    let cancelled = false;
    loaderQueue.acquire().then(release => {
      if (cancelled) { release(); return; }
      releaseRef.current = release;
      setCanLoad(true);
    });
    return () => { cancelled = true; };
  }, [inView, canLoad, src]);

  const handleDone = () => {
    if (src) loadedSrcs.add(src);
    releaseRef.current?.();
    releaseRef.current = null;
  };

  // Apply fetchpriority attribute directly to the DOM to avoid React warning
  useEffect(() => {
    if (!ref.current) return;
    if (fetchPriority) ref.current.setAttribute('fetchpriority', fetchPriority);
  }, [fetchPriority]);

  return (
    <img
      ref={ref}
      src={canLoad ? src : TRANSPARENT_1PX}
      alt={alt}
      className={className}
      style={style}
      sizes={sizes}
      srcSet={canLoad ? srcSet : undefined}
      loading="lazy"
      decoding="async"
      width={width as any}
      height={height as any}
      onLoad={(e) => { onLoad?.(e); handleDone(); }}
      onError={(e) => { onError?.(e); handleDone(); }}
      onClick={onClick}
    />
  );
}
