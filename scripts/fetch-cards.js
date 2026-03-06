const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '../public/cards');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filenames = [
  // 1: Jan
  "Hanafuda_January_Hikari_Alt.svg", "Hanafuda_January_Tanzaku_Alt.svg", "Hanafuda_January_Kasu_1_Alt.svg", "Hanafuda_January_Kasu_2_Alt.svg",
  // 2: Feb 
  "Hanafuda_February_Tane_Alt.svg", "Hanafuda_February_Tanzaku_Alt.svg", "Hanafuda_February_Kasu_1_Alt.svg", "Hanafuda_February_Kasu_2_Alt.svg",
  // 3: Mar
  "Hanafuda_March_Hikari_Alt.svg", "Hanafuda_March_Tanzaku_Alt.svg", "Hanafuda_March_Kasu_1_Alt.svg", "Hanafuda_March_Kasu_2_Alt.svg",
  // 4: Apr
  "Hanafuda_April_Tane_Alt.svg", "Hanafuda_April_Tanzaku_Alt.svg", "Hanafuda_April_Kasu_1_Alt.svg", "Hanafuda_April_Kasu_2_Alt.svg",
  // 5: May
  "Hanafuda_May_Tane_Alt.svg", "Hanafuda_May_Tanzaku_Alt.svg", "Hanafuda_May_Kasu_1_Alt.svg", "Hanafuda_May_Kasu_2_Alt.svg",
  // 6: Jun
  "Hanafuda_June_Tane_Alt.svg", "Hanafuda_June_Tanzaku_Alt.svg", "Hanafuda_June_Kasu_1_Alt.svg", "Hanafuda_June_Kasu_2_Alt.svg",
  // 7: Jul
  "Hanafuda_July_Tane_Alt.svg", "Hanafuda_July_Tanzaku_Alt.svg", "Hanafuda_July_Kasu_1_Alt.svg", "Hanafuda_July_Kasu_2_Alt.svg",
  // 8: Aug
  "Hanafuda_August_Hikari_Alt.svg", "Hanafuda_August_Tane_Alt.svg", "Hanafuda_August_Kasu_1_Alt.svg", "Hanafuda_August_Kasu_2_Alt.svg",
  // 9: Sep
  "Hanafuda_September_Tane_Alt.svg", "Hanafuda_September_Tanzaku_Alt.svg", "Hanafuda_September_Kasu_1_Alt.svg", "Hanafuda_September_Kasu_2_Alt.svg",
  // 10: Oct
  "Hanafuda_October_Tane_Alt.svg", "Hanafuda_October_Tanzaku_Alt.svg", "Hanafuda_October_Kasu_1_Alt.svg", "Hanafuda_October_Kasu_2_Alt.svg",
  // 11: Nov (Rain)
  "Hanafuda_November_Hikari_Alt.svg", "Hanafuda_November_Tane_Alt.svg", "Hanafuda_November_Tanzaku_Alt.svg", "Hanafuda_November_Kasu_Alt.svg",
  // 12: Dec
  "Hanafuda_December_Hikari_Alt.svg", "Hanafuda_December_Kasu_1_Alt.svg", "Hanafuda_December_Kasu_2_Alt.svg", "Hanafuda_December_Kasu_3_Alt.svg"
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'KoiKoiWebGameBot/1.0 (https://example.org; contact@example.org) Node.js'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location.startsWith('http') ? response.headers.location : `https://commons.wikimedia.org${response.headers.location}`, dest)
          .then(resolve)
          .catch(reject);
      } else if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err) => {
          fs.unlink(dest, () => reject(err));
        });
      } else {
        reject(new Error(`Failed to download ${url}. Status Code: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchAll() {
  console.log('Fetching Hanafuda SVGs sequentially to avoid 429s...');
  let hasError = false;
  for (let i = 0; i < filenames.length; i++) {
    const filename = filenames[i];
    const id = i;
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;
    const dest = path.join(targetDir, `${id}.svg`);

    // Skip if already downloaded and file is not empty length > 100 bytes (since error pages might be tiny)
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Skipping ID ${id}, already exists: ${filename}`);
      continue;
    }

    try {
      await downloadFile(url, dest);
      console.log(`Downloaded ID ${id}: ${filename}`);
    } catch (err) {
      console.error(`Error downloading ID ${id} (${filename}):`, err.message);
      hasError = true;
    }

    await delay(1000); // 1 second delay
  }

  if (hasError) console.log('Finished with some errors.');
  else console.log('Successfully fetched all 48 cards!');
}

fetchAll();
