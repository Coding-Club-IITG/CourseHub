// Give longer messages more reading time, bounded between eight and twenty seconds.
export const readingTime = (message) =>
    Math.min(20000, Math.max(8000, String(message).length * 65));
