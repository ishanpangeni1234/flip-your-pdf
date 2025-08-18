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
    const subjectCode = subjectCodes[subject];
    if (!subjectCode) continue;

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
        
        for (const file of files) {
          const parsed = parseFilename(file);
          if (!parsed) continue;

          const fileData = {
            name: file,
            path: `/Past Paper/${subject}/${session}/${yearDir}/${file}`,
          };

          if (parsed.fullVariant) { // It's a QP, MS, or IN file
            const paperId = `${parsed.season}${parsed.year.substring(2)}_${parsed.fullVariant}`;
            if (!paperGroups[paperId]) {
              paperGroups[paperId] = {
                id: paperId,
                series: `Paper ${parsed.paperNumber} Variant ${parsed.variantNumber}`,
                subject: subject,
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
          } else { // It's an ER or GT file
            const docId = `${subjectCode}_${parsed.season}${parsed.year.substring(2)}_${parsed.type}`;
            const seriesName = parsed.type === 'er' ? 'Examiner Report' : 'Grade Thresholds';

            paperGroups[docId] = {
              id: docId,
              series: seriesName,
              subject: subject,
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
          }
        }
        
        data[subject][session][year] = {
          // sessionDocs is no longer needed, everything is in paperList
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