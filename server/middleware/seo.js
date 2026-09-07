import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import CourseModel from "../modules/course/course.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://coursehub.codingclub.in";

const INDEX_HTML_PATH =
    process.env.INDEX_HTML_PATH ||
    path.resolve(__dirname, "../static/index.html");

let cachedIndexHtml = null;

function getIndexHtml() {
    if (!cachedIndexHtml) {
        try {
            cachedIndexHtml = fs.readFileSync(INDEX_HTML_PATH, "utf-8");
        } catch {
            return null;
        }
    }
    return cachedIndexHtml;
}

const BOT_UA_REGEX =
    /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|facebookexternalhit|twitterbot|discordbot|whatsapp|telegrambot|linkedinbot|slackbot|applebot|ia_archiver|msnbot|ahrefsbot|semrushbot|dotbot|rogerbot|360spider|sogou/i;

function isBot(userAgent) {
    if (!userAgent) return false;
    return BOT_UA_REGEX.test(userAgent);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function sanitizeJsonLd(json) {
    return json.replace(/<\//g, "<\\/");
}

function injectCourseMetaTags(html, course) {
    const courseSlug = encodeURIComponent(course.code.replace(/\s+/g, ""));
    const courseUrl  = `${BASE_URL}/browse/${courseSlug}`;

    const safeCode = escapeHtml(course.code);
    const safeName = escapeHtml(course.name);

    const title = `${safeCode} - ${safeName} Study Materials | CourseHub IIT Guwahati`;
    const description =
        `Find past papers, lecture slides, assignments, and notes for ` +
        `${safeCode} — ${safeName} at IIT Guwahati. ` +
        `Access all study materials on CourseHub.`;

    const ogImage = `${BASE_URL}/og-image.png`;

    const jsonLd = sanitizeJsonLd(
        JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: `${course.code} — ${course.name}`,
            description: `Find past papers, lecture slides, assignments, and notes for ${course.code} — ${course.name} at IIT Guwahati. Access all study materials on CourseHub.`,
            provider: {
                "@type": "Organization",
                name: "CourseHub IIT Guwahati",
                url: BASE_URL,
            },
            url: courseUrl,
        }),
    );

    const injectedBlock = `
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="CourseHub IIT Guwahati" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${courseUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    <script type="application/ld+json">${jsonLd}</script>`;

    let modified = html.replace(
        /<title>CourseHub<\/title>/i,
        `<title>${title}</title>`,
    );

    modified = modified.replace(
        /<meta\s+name="description"[^>]*\/?>/i,
        injectedBlock,
    );

    return modified;
}

export default async function seoMiddleware(req, res, next) {
    const userAgent = req.headers["user-agent"] || "";

    if (!isBot(userAgent)) {
        return next();
    }

    const match = req.path.match(/^\/([^/]+)/);
    if (!match) {
        return next();
    }

    try {
        const rawCode        = decodeURIComponent(match[1]);
        const normalizedCode = rawCode.replace(/\s+/g, "");
        const escapedCode    = normalizedCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flexPattern    = escapedCode.split("").join("\\s*");

        const course = await CourseModel.findOne({
            code: { $regex: new RegExp(`^${flexPattern}$`, "i") },
        })
            .select("name code")
            .lean();

        if (!course) {
            const safeCode = escapeHtml(normalizedCode);
            return res.status(404).send(
                `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>404 — Course Not Found | CourseHub IIT Guwahati</title>
</head>
<body>
  <h1>404 — Course Not Found</h1>
  <p>The course <strong>${safeCode}</strong> does not exist on CourseHub.</p>
  <p><a href="${BASE_URL}/browse">Browse all courses</a></p>
</body>
</html>`,
            );
        }

        const html = getIndexHtml();

        if (!html) {
            return next();
        }

        const modifiedHtml = injectCourseMetaTags(html, course);

        res.set("Vary", "User-Agent");
        res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        res.set("Content-Type", "text/html; charset=utf-8");
        return res.send(modifiedHtml);
    } catch (error) {
        return next(error);
    }
}
