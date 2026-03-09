function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  const v = url.toLowerCase();
  if (v.includes('tiktok.com')) return 'tiktok';
  if (v.includes('instagram.com')) return 'instagram';
  return null;
}

function requiresMediaUrl(serviceName = '') {
  const s = String(serviceName).toLowerCase();
  return /\b(vue|vues|view|views|like|likes|j'aime|jaime|comment|comments|share|shares|save|saves|reel|reels)\b/.test(s);
}

function isProfileUrl(url, platform) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');

    if (platform === 'tiktok') {
      // Profile: /@username ; Content: /@username/video/123...
      return /^\/@[^/]+$/.test(path);
    }

    if (platform === 'instagram') {
      // Profile: /username ; Content: /p/.. /reel/.. /tv/..
      const first = path.replace(/^\//, '').split('/')[0] || '';
      if (!first) return false;
      if (['p', 'reel', 'reels', 'tv', 'stories'].includes(first.toLowerCase())) return false;
      return path.split('/').filter(Boolean).length === 1;
    }

    return false;
  } catch {
    return false;
  }
}

async function fetchText(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractTikTokUsername(profileUrl) {
  try {
    const u = new URL(profileUrl);
    const m = u.pathname.match(/^\/@([^/]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function extractInstagramUsername(profileUrl) {
  try {
    const u = new URL(profileUrl);
    const seg = u.pathname.replace(/^\//, '').split('/')[0];
    return seg || null;
  } catch {
    return null;
  }
}

async function resolveTikTokLatestVideo(profileUrl) {
  const username = extractTikTokUsername(profileUrl);
  if (!username) return null;

  const html = await fetchText(profileUrl);
  if (!html) return null;

  // Try to find a plausible video id from embedded JSON.
  const idMatch = html.match(/"videoId":"(\d{8,})"/) || html.match(/"id":"(\d{8,})"/);
  if (!idMatch) return null;

  const videoId = idMatch[1];
  return `https://www.tiktok.com/@${username}/video/${videoId}`;
}

async function resolveInstagramLatestPost(profileUrl) {
  const username = extractInstagramUsername(profileUrl);
  if (!username) return null;

  const html = await fetchText(profileUrl);
  if (!html) return null;

  // Public page often contains shortcodes in embedded JSON.
  const codeMatch = html.match(/"shortcode":"([A-Za-z0-9_-]{5,})"/);
  if (!codeMatch) return null;

  const shortcode = codeMatch[1];
  return `https://www.instagram.com/p/${shortcode}/`;
}

export async function resolveLinkForService(rawLink, serviceName = '') {
  const original = String(rawLink || '').trim();
  if (!original) return { link: original, resolved: false, reason: 'empty-link' };

  // Followers/subscribers/profile-type services should keep profile links unchanged.
  if (!requiresMediaUrl(serviceName)) {
    return { link: original, resolved: false, reason: 'service-does-not-require-media-link' };
  }

  const platform = detectPlatform(original);
  if (!platform) {
    return { link: original, resolved: false, reason: 'unsupported-platform' };
  }

  // If already a content URL, keep as-is.
  if (!isProfileUrl(original, platform)) {
    return { link: original, resolved: false, reason: 'already-content-link' };
  }

  let latest = null;
  if (platform === 'tiktok') {
    latest = await resolveTikTokLatestVideo(original);
  } else if (platform === 'instagram') {
    latest = await resolveInstagramLatestPost(original);
  }

  if (!latest) {
    return { link: original, resolved: false, reason: 'latest-media-not-found' };
  }

  return { link: latest, resolved: true, reason: 'latest-media-resolved' };
}
