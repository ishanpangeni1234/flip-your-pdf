// scripts/generate-paper-data.js

const fs = require('fs');
const path = require('path');

const papersRootDir = path.join(process.cwd(), 'public', 'Past Paper');
const outputFilePath = path.join(process.cwd(), 'src', 'data', 'papers.json');

// --- UPDATED: Added new subjects ---
const subjectCodes = {
  'Computer': '9618',
  'Business Studies': '9609',
  'Economics': '9708',
  'English General Paper': '8021',
};

// --- UPDATED: Now handles 3-part filenames (er, gt) and 4-part (qp, ms, in) ---
function parseFilename(filename) {
  // e.g., 9618_s23_qp_11.pdf OR 9708_s23_er.pdf
  const parts = filename.replace('.pdf', '').split('_');

  if (parts.length === 4) {
    // Standard paper file (qp, ms, in)
    return {
      subjectCode: parts[0],
      season: parts[1], // 's' or 'w'
      year: `20${parts[1].substring(1)}`, // s23 -> 23
      type: parts[2], // 'qp', 'ms', 'in'
      variant: parts[3], // '11', '12', '21', etc.
    };
  } else if (parts.length === 3) {
    // Session-wide document (er, gt)
    const type = parts[2];
    if (type === 'er' || type === 'gt') {
      return {
        subjectCode: parts[0],
        season: parts[1],
        year: `20${parts[1].substring(1)}`,
        type: type, // 'er' or 'gt'
        variant: null, // No variant for these files
      };
    }
  }

  return null; // Invalid filename format
}

function generatePaperData() {
  const data = {};

  if (!fs.existsSync(papersRootDir)) {
    console.warn(`\n[Past Paper Scanner] Directory not found: "${papersRootDir}"`);
    console.warn(`[Past Paper Scanner] Please create it or ensure it's named correctly.`);
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, JSON.stringify({}, null, 2));
    console.log(`[Past Paper Scanner] Generated an empty "papers.json".\n`);
    return;
  }

  const subjects = fs.readdirSync(papersRootDir);

  for (const subject of subjects) {
    if (!subjectCodes[subject]) continue;
    data[subject] = {};
    const subjectPath = path.join(papersRootDir, subject);

    const sessions = fs.readdirSync(subjectPath);
    for (const session of sessions) {
      data[subject][session] = {};
      const sessionPath = path.join(subjectPath, session);

      const years = fs.readdirSync(sessionPath);
      for (const yearDir of years) {
        const year = yearDir.split('-')[0];
        const yearPath = path.join(sessionPath, yearDir);

        const files = fs.readdirSync(yearPath).filter(f => f.endsWith('.pdf'));

        // --- UPDATED: Logic to handle both paper variants and session-wide docs ---
        const paperGroups = {}; // Keyed by variant, e.g., '11'
        let sessionDocs = { er: null, gt: null }; // To hold er and gt files

        for (const file of files) {
          const parsed = parseFilename(file);
          if (!parsed) continue;

          const fileData = {
            name: file,
            path: `/Past Paper/${subject}/${session}/${yearDir}/${file}`,
          };

          if (parsed.variant) {
            // This is a standard paper with a variant (qp, ms, in)
            if (!paperGroups[parsed.variant]) {
              paperGroups[parsed.variant] = {
                id: `${parsed.season}${parsed.variant}`,
                series: `Paper ${parsed.variant[0]} Variant ${parsed.variant[1]}`,
                qp: null,
                ms: null,
                in: null,
              };
            }
            if (parsed.type === 'qp') paperGroups[parsed.variant].qp = fileData;
            if (parsed.type === 'ms') paperGroups[parsed.variant].ms = fileData;
            if (parsed.type === 'in') paperGroups[parsed.variant].in = fileData;
          } else {
            // This is a session-wide document (er, gt)
            if (parsed.type === 'er') sessionDocs.er = fileData;
            if (parsed.type === 'gt') sessionDocs.gt = fileData;
          }
        }
        
        // --- UPDATED: Storing data in the new JSON structure ---
        data[subject][session][year] = {
          sessionDocs: sessionDocs,
          paperList: Object.values(paperGroups).sort((a, b) => a.id.localeCompare(b.id)),
        };
      }
    }
  }

  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
  console.log(`\n[Past Paper Scanner] Successfully generated "papers.json" with the latest data.\n`);
}

generatePaperData();