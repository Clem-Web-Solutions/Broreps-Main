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

  // ── Strategy 1: parse __UNIVERSAL_DATA_FOR_REHYDRATION__ from the profile page ──
  const html = await fetchText(`https://www.tiktok.com/@${username}`, {
    'Referer': 'https://www.tiktok.com/',
    'Sec-Fetch-Site': 'same-origin',
  });

  if (html) {
    // Extract the JSON blob embedded in the SSR script tag
    const scriptMatch = html.match(/<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);
        // Navigate the known structures TikTok uses
        const scope = json?.__DEFAULT_SCOPE__ || json;
        const userDetail = scope?.['webapp.user-detail'] || scope?.userDetail;
        // itemList is the feed of videos; pick the first (most recent)
        const itemList =
          userDetail?.itemList ||
          userDetail?.items ||
          userDetail?.userInfo?.latestVideoList ||
          null;
        if (Array.isArray(itemList) && itemList.length > 0) {
          const videoId = itemList[0]?.id || itemList[0]?.video?.id || itemList[0]?.videoId;
          if (videoId) return `https://www.tiktok.com/@${username}/video/${videoId}`;
        }
      } catch { /* malformed JSON – fall through */ }
    }

    // ── Strategy 2: regex sweep on the raw HTML for a 15–19 digit video ID ──
    // TikTok video IDs are always 15–19 digits; user ID length is similar,
    // so restrict to patterns that are clearly associated with a video path.
    const videoPathMatch =
      html.match(/\/video\/(\d{15,19})/) ||
      html.match(/"videoId"\s*:\s*"(\d{15,19})"/) ||
      html.match(/"id"\s*:\s*"(\d{15,19})"/) ||
      html.match(/ItemModule[^{]*{[^}]*"(\d{15,19})"/);
    if (videoPathMatch) {
      return `https://www.tiktok.com/@${username}/video/${videoPathMatch[1]}`;
    }
  }

  // ── Strategy 3: unofficial user detail API (no auth required in many regions) ──
  const apiData = await fetchJson(
    `https://www.tiktok.com/api/user/detail/?uniqueId=${encodeURIComponent(username)}&aid=1988&app_name=tiktok_web&device_platform=web_pc`,
    { Referer: 'https://www.tiktok.com/', 'X-Requested-With': 'XMLHttpRequest' }
  );
  if (apiData) {
    const items = apiData?.userInfo?.latestVideoList || apiData?.itemList || apiData?.items || [];
    if (Array.isArray(items) && items.length > 0) {
      const videoId = items[0]?.id || items[0]?.video?.id;
      if (videoId) return `https://www.tiktok.com/@${username}/video/${videoId}`;
    }
  }

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

  // ── Strategy 1: Instagram's semi-public web_profile_info endpoint ──
  const igApiHeaders = {
    'X-IG-App-ID': '936619743392459',
    'X-ASBD-ID': '198387',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Referer': `https://www.instagram.com/${username}/`,
  };
  const profileData = await fetchJson(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    igApiHeaders
  );
  if (profileData) {
    const edges = profileData?.data?.user?.edge_owner_to_timeline_media?.edges || [];
    if (edges.length > 0) {
      const shortcode = edges[0]?.node?.shortcode;
      if (shortcode) return `https://www.instagram.com/p/${shortcode}/`;
    }
  }

  // ── Strategy 2: graphql query_hash approach ──
  // query_hash for "user media" is well-known and still accepted in many cases.
  const gqlData = await fetchJson(
    `https://www.instagram.com/graphql/query/?query_hash=e769aa130647d2354c40ea6a439bfc08&variables=${encodeURIComponent(JSON.stringify({ id: username, first: 1 }))}`,
    igApiHeaders
  );
  if (gqlData) {
    const edges = gqlData?.data?.user?.edge_user_to_photos_of_you?.edges ||
                  gqlData?.data?.user?.edge_owner_to_timeline_media?.edges || [];
    if (edges.length > 0) {
      const shortcode = edges[0]?.node?.shortcode;
      if (shortcode) return `https://www.instagram.com/p/${shortcode}/`;
    }
  }

  // ── Strategy 3: scrape the profile HTML page ──
  const html = await fetchText(`https://www.instagram.com/${username}/`, {
    'Referer': 'https://www.instagram.com/',
    'Sec-Fetch-Site': 'same-origin',
  });
  if (html) {
    // window._sharedData / __additionalDataLoaded JSON
    const sharedMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (sharedMatch) {
      try {
        const shared = JSON.parse(sharedMatch[1]);
        const edges =
          shared?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges || [];
        if (edges.length > 0 && edges[0]?.node?.shortcode) {
          return `https://www.instagram.com/p/${edges[0].node.shortcode}/`;
        }
      } catch { /* fall through */ }
    }

    // Generic shortcode sweep (8-12 char base64url, avoid false positives with word filters)
    const patterns = [
      /"shortcode"\s*:\s*"([A-Za-z0-9_-]{8,12})"/,
      /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]{8,12})\//,
      /"code"\s*:\s*"([A-Za-z0-9_-]{8,12})"/,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) return `https://www.instagram.com/p/${m[1]}/`;
    }
  }

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
