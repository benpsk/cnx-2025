export type RawImage = {
  src: string;        // Vite-resolved URL
  path: string;       // Repo path like /images/foo/bar.jpg
  file: string;       // file name
  folder: string;     // immediate parent folder
};

export type PhotoItem = RawImage & {
  width: number;
  height: number;
};

export type Album = {
  key: string;            // folder key
  title: string;          // display title
  path: string;           // e.g., images/chiang-mai-dam
  items: PhotoItem[];
};

// Find images under /images recursively via Vite glob import
// This returns an object { '/images/..jpg': Module }
const modules = import.meta.glob('/images/**/*.{jpg,jpeg,JPG,JPEG}', { eager: true, import: 'default' });

export function getRawImages(): RawImage[] {
  const raws: RawImage[] = [];
  Object.entries(modules).forEach(([absPath, url]) => {
    // absPath like '/images/trip/day-01/20240915-reykjavik-harbor.jpg'
    const segments = absPath.split('/').filter(Boolean);
    const file = segments[segments.length - 1];
    const folder = segments[segments.length - 2] ?? 'images';
    raws.push({ src: url as string, path: absPath.slice(1), file, folder });
  });
  return raws.sort((a, b) => a.path.localeCompare(b.path));
}

export async function measureImages(raws: RawImage[]): Promise<PhotoItem[]> {
  const jobs = raws.map(r => loadImageSize(r.src).then(dim => ({ ...r, ...dim })));
  return Promise.all(jobs);
}

export function groupIntoAlbums(items: PhotoItem[]): Album[] {
  const map = new Map<string, Album>();
  for (const it of items) {
    const key = it.path.split('/').slice(0, -1).join('/');
    if (!map.has(key)) {
      map.set(key, { key, title: albumTitleFromPath(key), path: key, items: [] });
    }
    map.get(key)!.items.push(it);
  }
  // sort items by file name (often encodes date)
  for (const a of map.values()) a.items.sort((x, y) => x.file.localeCompare(y.file));
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function albumTitleFromPath(p: string): string {
  // p like 'images/chiang-mai-dam' -> 'chiang mai dam'
  const base = p.split('/').pop() || 'images';
  return base.replace(/[-_]+/g, ' ');
}

function loadImageSize(src: string): Promise<{ width: number; height: number }>
{ return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

