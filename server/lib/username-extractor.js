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
