import cheerio from "cheerio";

export const normalizeCourseCode = (code) => {
    if (!code) return "";
    return code.toString().toUpperCase().replace(/\s+/g, "");
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getCourseCodeCaseInsensitiveRegex = (code) => {
    const normalizedCode = normalizeCourseCode(code);
    return new RegExp(`^${escapeRegex(normalizedCode)}$`, "i");
};

/**
 * Parses course allotments from the IITG Academic Portal HTML.
 * Supports parsing a specific student's courses or all student allotments at once.
 * 
 * @param {string} htmlData - Raw HTML string from the academic portal
 * @param {string|number} [rollNumber] - Optional. If provided, returns only this student's courses.
 * @returns {Array<{original: string, normalized: string}>|Object<string, string[]>} 
 *          If rollNumber is provided, returns Array of course objects.
 *          If no rollNumber, returns object mapping student roll to array of normalized course codes.
 */
export const parseCourseAllotmentsFromHtml = (htmlData, rollNumber = null) => {
    const $ = cheerio.load(htmlData);
    
    if (rollNumber !== null && rollNumber !== undefined) {
        const targetRollStr = rollNumber.toString().trim();
        const courseCodes = [];
        
        $("tr").each((i, elem) => {
            const details = $(elem).find("td");
            const studentRollNo = details.eq(2).text().trim();
            const rawCode = details.eq(3).text().trim();
            
            if (rawCode && studentRollNo === targetRollStr && !rawCode.includes("SA")) {
                const normalizedCode = normalizeCourseCode(rawCode);
                courseCodes.push({
                    original: rawCode,
                    normalized: normalizedCode,
                });
            }
        });
        
        return courseCodes;
    } else {
        const allotments = {};
        
        $("tr").each((i, elem) => {
            const details = $(elem).find("td");
            const rollStr = details.eq(2).text().trim();
            const rawCode = details.eq(3).text().trim();

            if (rollStr && rawCode && !rawCode.includes("SA")) {
                const roll = parseInt(rollStr);
                if (isNaN(roll)) return;
                const normalizedCode = normalizeCourseCode(rawCode);
                
                if (!allotments[roll]) {
                    allotments[roll] = new Set();
                }
                allotments[roll].add(normalizedCode);
            }
        });
        
        // Convert Sets to Arrays for the returned structure
        const result = {};
        for (const [roll, codeSet] of Object.entries(allotments)) {
            result[roll] = Array.from(codeSet);
        }
        return result;
    }
};

