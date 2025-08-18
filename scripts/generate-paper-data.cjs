const fs = require('fs');
const path = require('path');

const papersRootDir = path.join(process.cwd(), 'public', 'Past Paper');
const outputFilePath = path.join(process.cwd(), 'src', 'data', 'papers.json');

const subjectCodes = {
  'Computer': '9618',
  'Business Studies': '9609',
  'Economics': '9708',
  'English General Paper': '8021',
};

function parseFilename(filename) {
  const parts = filename.replace('.pdf', '').split('_');

  if (parts.length === 4) {
    return {
      subjectCode: parts[0],
      season: parts[1].charAt(0), // s23 -> 's'
      year: `20${parts[1].substring(1)}`, // s23 -> '2023'
      type: parts[2], // 'qp', 'ms', 'in'
      paperNumber: parts[3].charAt(0), // '11' -> '1'
      variantNumber: parts[3].charAt(1), // '11' -> '1'
      fullVariant: parts[3], // '11', '12', etc.
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

        const paperGroups = {};
        let sessionDocs = { er: null, gt: null };

        for (const file of files) {
          const parsed = parseFilename(file);
          if (!parsed) continue;

          const fileData = {
            name: file,
            path: `/Past Paper/${subject}/${session}/${yearDir}/${file}`,
          };

          if (parsed.fullVariant) {
            if (!paperGroups[parsed.fullVariant]) {
              // --- THIS IS THE KEY CHANGE ---
              // Add all the new required fields here
              paperGroups[parsed.fullVariant] = {
                id: `${parsed.season}20${parsed.year.substring(2)}${parsed.fullVariant}`, // e.g., s2311
                series: `Paper ${parsed.paperNumber} Variant ${parsed.variantNumber}`,
                // --- NEW FIELDS ---
                subject: subject,
                year: parseInt(parsed.year),
                session: session,
                season: parsed.season,
                paperNumber: parseInt(parsed.paperNumber),
                variantNumber: parseInt(parsed.variantNumber),
                // --- EXISTING FIELDS ---
                qp: null,
                ms: null,
                in: null,
              };
            }
            if (parsed.type === 'qp') paperGroups[parsed.fullVariant].qp = fileData;
            if (parsed.type === 'ms') paperGroups[parsed.fullVariant].ms = fileData;
            if (parsed.type === 'in') paperGroups[parsed.fullVariant].in = fileData;
          } else {
            if (parsed.type === 'er') sessionDocs.er = fileData;
            if (parsed.type === 'gt') sessionDocs.gt = fileData;
          }
        }
        
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