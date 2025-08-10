// scripts/generate-paper-data.js

const fs = require('fs');
const path = require('path');

const papersRootDir = path.join(process.cwd(), 'public', 'Past Paper');
const outputFilePath = path.join(process.cwd(), 'src', 'data', 'papers.json');

const subjectCodes = {
  'Computer': '9618',
  'Business Studies': '9609',
};

function parseFilename(filename) {
  // e.g., 9618_s23_qp_11.pdf
  const parts = filename.replace('.pdf', '').split('_');
  if (parts.length !== 4) return null;
  return {
    subjectCode: parts[0],
    season: parts[1], // 's' or 'w'
    year: `20${parts[1].substring(1)}`, // s23 -> 23
    type: parts[2], // 'qp', 'ms', 'in'
    variant: parts[3], // '11', '12', '21', etc.
  };
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
    if (!subjectCodes[subject]) continue; // Skip if not a configured subject
    data[subject] = {};
    const subjectPath = path.join(papersRootDir, subject);

    const sessions = fs.readdirSync(subjectPath);
    for (const session of sessions) {
      data[subject][session] = {};
      const sessionPath = path.join(subjectPath, session);

      const years = fs.readdirSync(sessionPath);
      for (const yearDir of years) {
        // e.g., "2023-May-Jun" -> "2023"
        const year = yearDir.split('-')[0];
        const yearPath = path.join(sessionPath, yearDir);

        const files = fs.readdirSync(yearPath).filter(f => f.endsWith('.pdf'));

        const paperGroups = {}; // Keyed by variant, e.g., '11'

        for (const file of files) {
          const parsed = parseFilename(file);
          if (!parsed) continue;

          if (!paperGroups[parsed.variant]) {
            paperGroups[parsed.variant] = {
              id: `${parsed.season}${parsed.variant}`,
              series: `Paper ${parsed.variant[0]} Variant ${parsed.variant[1]}`,
              qp: null,
              ms: null,
              in: null,
            };
          }

          const fileData = {
            name: file,
            path: `/Past Paper/${subject}/${session}/${yearDir}/${file}`,
          };

          if (parsed.type === 'qp') paperGroups[parsed.variant].qp = fileData;
          if (parsed.type === 'ms') paperGroups[parsed.variant].ms = fileData;
          if (parsed.type === 'in') paperGroups[parsed.variant].in = fileData;
        }
        
        // Convert the groups object to a sorted array
        data[subject][session][year] = Object.values(paperGroups).sort((a, b) => a.id.localeCompare(b.id));
      }
    }
  }

  // Ensure the output directory exists
  fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
  // Write the final JSON file
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2));
  console.log(`\n[Past Paper Scanner] Successfully generated "papers.json" with the latest data.\n`);
}

generatePaperData();