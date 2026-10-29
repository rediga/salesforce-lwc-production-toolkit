/**
 * Clipboard helpers for LWC. Prefer the async Clipboard API; fall back to a
 * temporary textarea + `document.execCommand('copy')` when `navigator.clipboard`
 * is unavailable (older browsers, some Lightning Desktop / Experience Cloud
 * contexts, or insecure origins). Every project that has a "Copy Id" /
 * "Copy Case Number" button ends up writing this twice - once for the happy
 * path and once for the fallback.
 */

/**
 * Copies plain text via a hidden textarea. Used when the Clipboard API is
 * missing or rejects. Returns false if the browser blocks the copy.
 * @param {string} text
 * @returns {boolean}
 */
export function copyTextFallback(text) {
    const value = text == null ? '' : String(text);
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    let succeeded = false;
    try {
        succeeded = document.execCommand('copy');
    } catch (e) {
        succeeded = false;
    }
    document.body.removeChild(textarea);
    return succeeded;
}

/**
 * Copies plain text to the clipboard. Tries `navigator.clipboard.writeText`
 * first, then `copyTextFallback`. Resolves to `true` when the text was
 * copied, `false` when both paths fail (caller should toast an error).
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
    const value = text == null ? '' : String(text);

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch (e) {
            // Fall through - Lightning Desktop / iframe CSP can reject writeText
            // even when the API exists.
        }
    }

    return copyTextFallback(value);
}

/**
 * Convenience for the common "Copy Salesforce Id / Case Number / Circuit Id"
 * pattern: copies `value`, optionally trims whitespace first.
 * @param {*} value
 * @param {{ trim?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
export async function copyValue(value, { trim = true } = {}) {
    let text = value == null ? '' : String(value);
    if (trim) {
        text = text.trim();
    }
    if (!text) {
        return false;
    }
    return copyText(text);
}
