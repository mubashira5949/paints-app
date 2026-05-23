/**
 * Device Info Utilities
 * Helper functions to extract device and location information from requests.
 */

/**
 * Parses a User-Agent string to return a friendly device/browser name.
 * @param ua The User-Agent string from request headers.
 * @returns A friendly string like "Chrome on Windows".
 */
export function getDeviceFromUserAgent(ua: string | undefined): string {
    if (!ua) return 'Unknown Device';
    
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // OS detection
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    // Browser detection
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/msie|trident/i.test(ua)) browser = 'IE';

    return `${browser} on ${os}`;
}

/**
 * Resolves an IP address to a physical location (City, Country).
 * Uses the free ip-api.com service.
 */
export async function getLocationFromIp(ip: string | undefined, forwardedIp?: string): Promise<string> {
    const targetIp = (forwardedIp || ip || '').split(',')[0].trim();

    if (!targetIp || targetIp === '127.0.0.1' || targetIp === '::1' || targetIp.startsWith('192.168.') || targetIp.startsWith('10.')) {
        return 'Local Network';
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`http://ip-api.com/json/${targetIp}?fields=status,message,country,city`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data: any = await response.json();
        
        if (data.status === 'success') {
            return `${data.city}, ${data.country}`;
        }
        return `Unknown Location (${targetIp})`;
    } catch (err) {
        return `Location Pending (${targetIp})`;
    }
}
