// ─── Platform detection ───────────────────────────────────────────────────────

function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  const v = url.toLowerCase();
  if (v.includes('tiktok.com')) return 'tiktok';
  if (v.includes('instagram.com')) return 'instagram';
  return null;
}

// Only engagement services (views/likes/comments…) need a content URL.
// Followers/subscribers must keep the profile URL as-is.
function requiresMediaUrl(serviceName = '') {
  const s = String(serviceName).toLowerCase();
  return /\b(vue|vues|view|views|like|likes|j'aime|jaime|comment|comments|share|shares|save|saves|reel|reels)\b/.test(s);
}

function isProfileUrl(url, platform) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    if (platform === 'tiktok') {
      return /^\/@[^/]+$/.test(path);
    }
    if (platform === 'instagram') {
      const first = path.replace(/^\//, '').split('/')[0] || '';
      if (!first) return false;
      if (['p', 'reel', 'reels', 'tv', 'stories', 'explore'].includes(first.toLowerCase())) return false;
      return path.split('/').filter(Boolean).length === 1;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function fetchText(url, extraHeaders = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
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

async function fetchJson(url, headers = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/json, */*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
        ...headers,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── TikTok ───────────────────────────────────────────────────────────────────

function extractTikTokUsername(profileUrl) {
  try {
    const u = new URL(profileUrl);
    const m = u.pathname.match(/^\/@([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function resolveTikTokLatestVideo(profileUrl) {
  const username = extractTikTokUsername(profileUrl);
  if (!username) return null;

  console.log(`[RESOLVER] TikTok: résolution dernière vidéo pour @${username}`);

  // ── Strategy 1: TikWm community API (free, no auth, most reliable in production) ──
  // TikWm is a well-known public data API that proxies TikTok data without auth.
  try {
    const tikwm = await fetchJson(
      `https://api.tikwm.com/user/videos?unique_id=${encodeURIComponent('@' + username)}&count=1&cursor=0`,
      { 'Accept': 'application/json', 'Origin': 'https://tikwm.com' },
      12000
    );
    if (tikwm?.code === 0) {
      const video = tikwm?.data?.videos?.[0];
      const videoId = video?.video_id || video?.id;
      if (videoId) {
        console.log(`[RESOLVER] TikTok ✅ TikWm — vidéo: ${videoId}`);
        return `https://www.tiktok.com/@${username}/video/${videoId}`;
      }
    }
  } catch { /* fall through */ }

  // ── Strategy 2: parse __UNIVERSAL_DATA_FOR_REHYDRATION__ from the profile page ──
  const html = await fetchText(`https://www.tiktok.com/@${username}`, {
    'Referer': 'https://www.tiktok.com/',
    'Sec-Fetch-Site': 'same-origin',
  });

  if (html) {
    const scriptMatch = html.match(/<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);
        const scope = json?.__DEFAULT_SCOPE__ || json;
        const userDetail = scope?.['webapp.user-detail'] || scope?.userDetail;
        const itemList =
          userDetail?.itemList ||
          userDetail?.items ||
          userDetail?.userInfo?.latestVideoList ||
          null;
        if (Array.isArray(itemList) && itemList.length > 0) {
          const videoId = itemList[0]?.id || itemList[0]?.video?.id || itemList[0]?.videoId;
          if (videoId) {
            console.log(`[RESOLVER] TikTok ✅ UNIVERSAL_DATA — vidéo: ${videoId}`);
            return `https://www.tiktok.com/@${username}/video/${videoId}`;
          }
        }
      } catch { /* fall through */ }
    }

    // ── Strategy 3: regex sweep for a 15–19 digit video ID in the HTML ──
    const videoPathMatch =
      html.match(/\/video\/(\d{15,19})/) ||
      html.match(/"videoId"\s*:\s*"(\d{15,19})"/) ||
      html.match(/"id"\s*:\s*"(\d{15,19})"/);
    if (videoPathMatch) {
      console.log(`[RESOLVER] TikTok ✅ regex HTML — vidéo: ${videoPathMatch[1]}`);
      return `https://www.tiktok.com/@${username}/video/${videoPathMatch[1]}`;
    }
  }

  console.warn(`[RESOLVER] TikTok ❌ Aucune stratégie n'a résolu @${username}`);
  return null;
}

// ─── Instagram ────────────────────────────────────────────────────────────────

function extractInstagramUsername(profileUrl) {
  try {
    const u = new URL(profileUrl);
    const seg = u.pathname.replace(/^\//, '').split('/')[0];
    return seg || null;
  } catch {
    return null;
  }
}

async function resolveInstagramLatestPost(profileUrl) {
  const username = extractInstagramUsername(profileUrl);
  if (!username) return null;

  console.log(`[RESOLVER] Instagram: résolution dernier post pour @${username}`);

  // Full browser-like headers required by Instagram
  const igHeaders = {
    'X-IG-App-ID': '936619743392459',
    'X-ASBD-ID': '198387',
    'X-IG-WWW-Claim': '0',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://www.instagram.com',
    'Referer': `https://www.instagram.com/${username}/`,
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept': '*/*',
  };

  // ── Strategy 1: web_profile_info endpoint ──
  const profileData = await fetchJson(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    igHeaders
  );
  if (profileData) {
    const edges = profileData?.data?.user?.edge_owner_to_timeline_media?.edges || [];
    if (edges.length > 0) {
      const node = edges[0]?.node;
      const shortcode = node?.shortcode || node?.code;
      if (shortcode) {
        const type = node?.is_video ? 'reel' : 'p';
        console.log(`[RESOLVER] Instagram ✅ web_profile_info — ${type}/${shortcode}`);
        return `https://www.instagram.com/${type}/${shortcode}/`;
      }
    }
  }

  // ── Strategy 2: ?__a=1 endpoint (still active on some regions) ──
  const a1Data = await fetchJson(
    `https://www.instagram.com/${encodeURIComponent(username)}/?__a=1&__d=dis`,
    igHeaders
  );
  if (a1Data) {
    const edges = a1Data?.graphql?.user?.edge_owner_to_timeline_media?.edges ||
                  a1Data?.data?.user?.edge_owner_to_timeline_media?.edges || [];
    if (edges.length > 0) {
      const shortcode = edges[0]?.node?.shortcode;
      if (shortcode) {
        console.log(`[RESOLVER] Instagram ✅ __a=1 — p/${shortcode}`);
        return `https://www.instagram.com/p/${shortcode}/`;
      }
    }
  }

  // ── Strategy 3: HTML page scraping ──
  const html = await fetchText(`https://www.instagram.com/${username}/`, {
    'Referer': 'https://www.instagram.com/',
    'Sec-Fetch-Site': 'same-origin',
  });
  if (html) {
    const sharedMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (sharedMatch) {
      try {
        const shared = JSON.parse(sharedMatch[1]);
        const edges =
          shared?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];
        if (edges.length > 0 && edges[0]?.node?.shortcode) {
          console.log(`[RESOLVER] Instagram ✅ _sharedData HTML`);
          return `https://www.instagram.com/p/${edges[0].node.shortcode}/`;
        }
      } catch { /* fall through */ }
    }

    // Generic shortcode / reel sweep
    const patterns = [
      [/instagram\.com\/(reel)\/([A-Za-z0-9_-]{8,12})\//, (m) => `https://www.instagram.com/reel/${m[2]}/`],
      [/instagram\.com\/(p)\/([A-Za-z0-9_-]{8,12})\//, (m) => `https://www.instagram.com/p/${m[2]}/`],
      [/"shortcode"\s*:\s*"([A-Za-z0-9_-]{8,12})"/, (m) => `https://www.instagram.com/p/${m[1]}/`],
    ];
    for (const [pat, build] of patterns) {
      const m = html.match(pat);
      if (m) {
        console.log(`[RESOLVER] Instagram ✅ regex HTML`);
        return build(m);
      }
    }
  }

  console.warn(`[RESOLVER] Instagram ❌ Aucune stratégie n'a résolu @${username}`);
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function resolveLinkForService(rawLink, serviceName = '') {
  const original = String(rawLink || '').trim();
  if (!original) return { link: original, resolved: false, reason: 'empty-link' };

  // Followers / subscribers must keep the profile URL unchanged.
  if (!requiresMediaUrl(serviceName)) {
    return { link: original, resolved: false, reason: 'service-does-not-require-media-link' };
  }

  const platform = detectPlatform(original);
  if (!platform) {
    return { link: original, resolved: false, reason: 'unsupported-platform' };
  }

  // Already a content URL (video/post/reel) — nothing to do.
  if (!isProfileUrl(original, platform)) {
    return { link: original, resolved: false, reason: 'already-content-link' };
  }

  // It's a profile URL for a views/likes service — resolve to latest content.
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
