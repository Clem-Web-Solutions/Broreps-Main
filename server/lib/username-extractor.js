/**
 * Extract username from social media URLs
 * Supports: TikTok, Instagram, Twitch
 */

/**
 * Extract username from TikTok URL
 * @param {string} url - TikTok profile URL
 * @returns {string|null} Username without @ prefix
 */
function extractTikTokUsername(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Remove leading @ and trailing slash
        const username = pathname.replace(/^@+/, '').replace(/\/$/, '');

        return username || null;
    } catch {
        return null;
    }
}

/**
 * Extract username from Instagram URL
 * @param {string} url - Instagram profile URL
 * @returns {string|null} Username without @ prefix
 */
function extractInstagramUsername(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Remove leading / and trailing slash
        // Examples: /username, /username/, /username/followers
        const username = pathname.replace(/^\/+/, '').split('/')[0];

        return username || null;
    } catch {
        return null;
    }
}

/**
 * Extract username from Twitch URL
 * @param {string} url - Twitch profile URL
 * @returns {string|null} Username without @ prefix
 */
function extractTwitchUsername(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        // Remove leading / and trailing slash
        const username = pathname.replace(/^\/+/, '').replace(/\/$/, '');

        return username || null;
    } catch {
        return null;
    }
}

/**
 * Detect platform from URL
 * @param {string} url - Social media URL
 * @returns {string|null} Platform name: 'tiktok', 'instagram', 'twitch'
 */
function detectPlatform(url) {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitch.tv')) return 'twitch';
    return null;
}

/**
 * Main function - extract username from any supported social media URL
 * @param {string} url - Social media profile URL
 * @returns {{username: string, platform: string}|null} Object with username and platform
 */
export function extractUsername(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const platform = detectPlatform(url);
    if (!platform) {
        return null;
    }

    let username = null;

    switch (platform) {
        case 'tiktok':
            username = extractTikTokUsername(url);
            break;
        case 'instagram':
            username = extractInstagramUsername(url);
            break;
        case 'twitch':
            username = extractTwitchUsername(url);
            break;
    }

    if (!username) {
        return null;
    }

    return { username, platform };
}

/**
 * Detect platform from a product/variant title string.
 * @param {string} title
 * @returns {'tiktok'|'instagram'|'twitch'|'discord'|null}
 */
function detectPlatformFromTitle(title) {
    if (!title) return null;
    const t = title.toLowerCase();
    if (t.includes('twitch'))    return 'twitch';
    if (t.includes('tiktok'))    return 'tiktok';
    if (t.includes('instagram')) return 'instagram';
    if (t.includes('discord'))   return 'discord';
    return null;
}

/** Platform → base profile URL */
const PLATFORM_BASE = {
    tiktok:    'https://www.tiktok.com/@',
    instagram: 'https://www.instagram.com/',
    twitch:    'https://www.twitch.tv/',
    discord:   null, // no standard profile URL
};

/**
 * Normalize a raw social input (URL *or* bare username) into a canonical URL.
 *
 * Rules:
 *  1. Already a URL  → return as-is.
 *  2. Looks like a username (@handle or plain handle) → build URL from platform.
 *     Platform is inferred from `productTitle` when not detectable from the value itself.
 *
 * @param {string}  raw          - Raw value entered by the customer.
 * @param {string}  [productTitle] - Product/variant title used as fallback for platform detection.
 * @returns {string}  Canonical URL, or the original value if nothing could be determined.
 */
export function normalizeSocialLink(raw, productTitle = '') {
    if (!raw || typeof raw !== 'string') return raw;

    const trimmed = raw.trim();

    // Already a URL → return as-is
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    // Strip leading @ if present
    const username = trimmed.replace(/^@+/, '').trim();

    if (!username) return raw;

    // Detect platform: first try the value itself (e.g. "twitch.tv/user"), then fall back to product title
    let platform = detectPlatform(trimmed) || detectPlatform(username) || detectPlatformFromTitle(productTitle);

    if (!platform || !PLATFORM_BASE[platform]) {
        // Can't resolve → return cleaned value (strip @ at least)
        console.log(`[SOCIAL] Cannot detect platform for "${trimmed}" (product: "${productTitle}") — keeping as-is`);
        return username;
    }

    const url = PLATFORM_BASE[platform] + username;
    console.log(`[SOCIAL] Normalized "${raw}" → "${url}" (platform: ${platform})`);
    return url;
}
