import express from "express";
import CourseModel from "../course/course.model.js";

const router = express.Router();
const BASE_URL = "https://coursehub.codingclub.in";

// 1 sitemap.xml

router.get("/sitemap.xml", async (req, res) => {
    try {
        const courses = await CourseModel.find().select("code updatedAt").lean();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url>
                <loc>${BASE_URL}/</loc>
                <changefreq>weekly</changefreq>
                <priority>1.0</priority>
            </url>
            <url>
                <loc>${BASE_URL}/browse</loc>
                <changefreq>daily</changefreq>
                <priority>0.9</priority>
            </url>`;

        for (const course of courses) {
            const lastmod = course.updatedAt && !isNaN(new Date(course.updatedAt))
                ? new Date(course.updatedAt).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0];

            xml += `
                <url>
                    <loc>${BASE_URL}/browse/${encodeURIComponent(course.code.replace(/\s+/g,""))}</loc>
                    <lastmod>${lastmod}</lastmod>
                    <changefreq>weekly</changefreq>
                    <priority>0.8</priority>
                </url>`;
        }

        xml += "\n</urlset>";

        res.set("Cache-Control", "public, max-age=86400, s-maxage=86400")
        res.set("Content-Type", "application/xml");
        res.send(xml);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        res.status(500).send("Error generating sitemap");
    }
});

// 2 robots.txt 

router.get("/robots.txt", (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /
Allow: /browse
Allow: /browse/

Disallow: /dashboard
Disallow: /profile
Disallow: /loading
Disallow: /api/
Disallow: /admin/

Sitemap: ${BASE_URL}/sitemap.xml`;


    res.set("Content-Type", "text/plain");
    res.send(robotsTxt);
});

export default router;
