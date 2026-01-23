const fs = require('fs');
const path = require('path');

// Configuration
const REPO_OWNER = 'ishanpangeni1234';
const REPO_NAME = 'Past-Paper-Storage';
const BRANCH = 'main'; // Adjust if your branch is named differently
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'external-papers.json');

const subjectCodes = {
    'Computer': '9618',
    'Computer Science': '9618',
    'Business Studies': '9609',
    'Economics': '9708',
    'English General Paper': '8021',
};

function parseFilename(filename) {
    const parts = filename.replace('.pdf', '').split('_');

    if (parts.length === 4) {
        return {
            subjectCode: parts[0],
            season: parts[1].charAt(0),
            year: `20${parts[1].substring(1)}`,
            type: parts[2], // 'qp', 'ms', 'in'
            paperNumber: parts[3].charAt(0),
            variantNumber: parts[3].charAt(1),
            fullVariant: parts[3],
        };
    } else if (parts.length === 3) {
        const type = parts[2];
        if (type === 'er' || type === 'gt') {
            return {
                subjectCode: parts[0],
                season: parts[1].charAt(0),
                year: `20${parts[1].substring(1)}`,
                type: type,
                paperNumber: null,
                variantNumber: null,
                fullVariant: null,
            };
        }
    }

    return null;
}

async function generateExternalPaperData() {
    console.log(`\n[GitHub Scanner] Starting scan for ${REPO_OWNER}/${REPO_NAME}...`);

    try {
        // 1. Fetch the recursive tree from GitHub API
        const treeUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${BRANCH}?recursive=1`;
        const response = await fetch(treeUrl);

        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const files = result.tree.filter(item => item.type === 'blob' && item.path.endsWith('.pdf'));

        console.log(`[GitHub Scanner] Found ${files.length} PDF files.`);

        const data = {};

        for (const fileItem of files) {
            // fileItem.path looks like: "Computer/May-Jun/2020/9618_s20_qp_11.pdf"
            const pathParts = fileItem.path.split('/');
            const filename = pathParts[pathParts.length - 1];

            // Reconstruct the logic based on the folder structure provided by pathParts
            // But we'll rely on parseFilename for the core metadata
            const parsed = parseFilename(filename);
            if (!parsed) continue;

            // Find the subject name from path or code
            // In your local script, it used the direct parent folders. 
            // Here we'll try to match the code or use the top-level folder name.
            let subjectName = pathParts[0];
            // Find proper display name from subjectCodes mapping
            for (const [name, code] of Object.entries(subjectCodes)) {
                if (code === parsed.subjectCode) {
                    subjectName = name;
                    break;
                }
            }

            // Extract session and year from path or parsed data
            const session = pathParts[1] || 'Unknown';
            const year = parsed.year;

            if (!data[subjectName]) data[subjectName] = {};
            if (!data[subjectName][session]) data[subjectName][session] = {};
            if (!data[subjectName][session][year]) data[subjectName][session][year] = { paperList: [] };

            const paperGroups = data[subjectName][session][year].paperGroups || {};

            // Format path as jsDelivr URL for speed
            const cdnPath = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@${BRANCH}/${fileItem.path}`;

            const fileData = {
                name: filename,
                path: cdnPath,
            };

            if (parsed.fullVariant) {
                const paperId = `${parsed.subjectCode}_${parsed.season}${parsed.year.substring(2)}_${parsed.fullVariant}`;
                if (!paperGroups[paperId]) {
                    paperGroups[paperId] = {
                        id: paperId,
                        series: `Paper ${parsed.paperNumber} Variant ${parsed.variantNumber}`,
                        subject: subjectName,
                        year: parseInt(parsed.year),
                        session: session,
                        season: parsed.season,
                        paperNumber: parseInt(parsed.paperNumber),
                        variantNumber: parseInt(parsed.variantNumber),
                        qp: null,
                        ms: null,
                        in: null,
                        er: null,
                        gt: null,
                    };
                }
                if (parsed.type === 'qp') paperGroups[paperId].qp = fileData;
                if (parsed.type === 'ms') paperGroups[paperId].ms = fileData;
                if (parsed.type === 'in') paperGroups[paperId].in = fileData;
            } else {
                const docId = `${parsed.subjectCode}_${parsed.season}${parsed.year.substring(2)}_${parsed.type}`;
                const seriesName = parsed.type === 'er' ? 'Examiner Report' : 'Grade Thresholds';

                if (!paperGroups[docId]) {
                    paperGroups[docId] = {
                        id: docId,
                        series: seriesName,
                        subject: subjectName,
                        year: parseInt(parsed.year),
                        session: session,
                        season: parsed.season,
                        paperNumber: 0,
                        variantNumber: 0,
                        qp: null,
                        ms: null,
                        in: null,
                        er: parsed.type === 'er' ? fileData : null,
                        gt: parsed.type === 'gt' ? fileData : null,
                    };
                } else {
                    if (parsed.type === 'er') paperGroups[docId].er = fileData;
                    if (parsed.type === 'gt') paperGroups[docId].gt = fileData;
                }
            }

            data[subjectName][session][year].paperGroups = paperGroups;
        }

        // Final processing: convert paperGroups objects to sorted paperList arrays
        for (const subject in data) {
            for (const session in data[subject]) {
                for (const year in data[subject][session]) {
                    const groups = data[subject][session][year].paperGroups;
                    data[subject][session][year].paperList = Object.values(groups).sort((a, b) => a.id.localeCompare(b.id));
                    delete data[subject][session][year].paperGroups;
                }
            }
        }

        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
        console.log(`[GitHub Scanner] Successfully generated "external-papers.json" with the latest data.\n`);

    } catch (error) {
        console.error(`\n[GitHub Scanner] ERROR: ${error.message}`);
        // During build, we might want to fail or just emit an empty object
        if (!fs.existsSync(OUTPUT_FILE)) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify({}));
        }
    }
}

generateExternalPaperData();
