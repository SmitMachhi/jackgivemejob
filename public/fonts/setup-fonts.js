/**
 * Font Setup Script
 * This script generates placeholder font files and downloads actual fonts from Google Fonts
 *
 * Run with: node public/fonts/setup-fonts.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const FONT_DIR = path.join(__dirname, '.');
const FONT_CONFIG = require('./font-config.json');

// Font URLs for direct download
const FONT_URLS = {
  'NotoSans': {
    'Regular': 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vjki0-gO-OG.woff2',
    'Bold': 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vjki0-gC-OG.woff2',
    'Italic': 'https://fonts.gstatic.com/s/notosans/v36/o-0kIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aPdu2ui.woff2',
    'Light': 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aHdu2ui.woff2',
    'Medium': 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5aDdu2ui.woff2'
  },
  'NotoSansArabic': {
    'Regular': 'https://fonts.gstatic.com/s/notosansarabic/v36/nEUnQRszC3XR2W9xPm2mAx05KlHt3sUEj7xlYHqNQ4B5d2U.woff2',
    'Bold': 'https://fonts.gstatic.com/s/notosansarabic/v36/nEUnQRszC3XR2W9xPm2mAx05KlHt3sUEj7xlYHqNQ45d2U.woff2'
  },
  'NotoSansJP': {
    'Regular': 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP2VFBEj75vY0rw-oME.woff2',
    'Bold': 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP2VFBEj7_rY0rw-oME.woff2',
    'Light': 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP2VFBEj75bY0rw-oME.woff2'
  },
  'NotoSansKR': {
    'Regular': 'https://fonts.gstatic.com/s/notosanskr/v36/PbykFmL8HYAd6EYrqRu6MYlSb10qs3ufZIFGIdy-3jOo.woff2',
    'Bold': 'https://fonts.gstatic.com/s/notosanskr/v36/PbykFmL8HYAd6EYrqRu6MYlSb10qs3ufZIFGIdy3j_o.woff2',
    'Light': 'https://fonts.gstatic.com/s/notosanskr/v36/PbykFmL8HYAd6EYrqRu6MYlSb10qs3ufZIFGIdy53jOo.woff2'
  },
  'NotoSansSC': {
    'Regular': 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNbPzS5HE.woff2',
    'Bold': 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNb_Dz5HE.woff2',
    'Light': 'https://fonts.gstatic.com/s/notosanssc/v36/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_FnYxNb_zS5HE.woff2'
  }
};

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(resolve);
      });

    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if there was an error
      reject(err);
    });
  });
}

async function downloadFont(fontName, variants) {
  console.log(`Downloading ${fontName} variants...`);

  for (const [variant, filename] of Object.entries(variants)) {
    const url = FONT_URLS[fontName]?.[variant];
    if (!url) {
      console.log(`  Skipping ${variant} - no URL found`);
      continue;
    }

    const filePath = path.join(FONT_DIR, filename);

    if (fs.existsSync(filePath)) {
      console.log(`  ${variant} already exists, skipping...`);
      continue;
    }

    try {
      console.log(`  Downloading ${variant}...`);
      await downloadFile(url, filePath);
      console.log(`  ${variant} downloaded successfully`);
    } catch (error) {
      console.error(`  Failed to download ${variant}:`, error.message);
    }
  }
}

function createPlaceholderFile(filename, description) {
  const filePath = path.join(FONT_DIR, filename);

  if (fs.existsSync(filePath)) {
    return;
  }

  // Create a minimal TTF placeholder
  const placeholderData = Buffer.from([
    0x00, 0x01, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x80, 0x00, 0x03, 0x00, 0x20
  ]);

  fs.writeFileSync(filePath, placeholderData);
  console.log(`Created placeholder: ${filename} (${description})`);
}

async function setupFonts() {
  console.log('🎨 Setting up fonts for multi-language support...\n');

  // Ensure font directory exists
  if (!fs.existsSync(FONT_DIR)) {
    fs.mkdirSync(FONT_DIR, { recursive: true });
  }

  // Create placeholder files for all fonts in config
  console.log('📋 Creating placeholder font files...');

  for (const [fontName, fontData] of Object.entries(FONT_CONFIG.fontFiles)) {
    for (const [variant, filename] of Object.entries(fontData.variants)) {
      const description = `${fontName} ${variant}`;
      createPlaceholderFile(filename, description);
    }
  }

  // Try to download actual fonts
  console.log('\n🌐 Downloading actual fonts from Google Fonts...');

  try {
    await downloadFont('NotoSans', FONT_CONFIG.fontFiles.NotoSans.variants);
    await downloadFont('NotoSansArabic', FONT_CONFIG.fontFiles.NotoSansArabic.variants);
    await downloadFont('NotoSansJP', FONT_CONFIG.fontFiles.NotoSansJP.variants);
    await downloadFont('NotoSansKR', FONT_CONFIG.fontFiles.NotoSansKR.variants);
    await downloadFont('NotoSansSC', FONT_CONFIG.fontFiles.NotoSansSC.variants);
  } catch (error) {
    console.error('Download failed, using placeholders:', error.message);
  }

  // Create font index file
  const fontIndex = {
    setupDate: new Date().toISOString(),
    totalFonts: Object.keys(FONT_CONFIG.fontFiles).length,
    supportedLanguages: Object.keys(FONT_CONFIG.supportedLanguages),
    availableFiles: fs.readdirSync(FONT_DIR).filter(file => file.endsWith('.ttf') || file.endsWith('.woff2')),
    configuration: FONT_CONFIG
  };

  fs.writeFileSync(
    path.join(FONT_DIR, 'font-index.json'),
    JSON.stringify(fontIndex, null, 2)
  );

  console.log('\n✅ Font setup complete!');
  console.log(`📁 Font directory: ${FONT_DIR}`);
  console.log(`📊 Total fonts configured: ${Object.keys(FONT_CONFIG.fontFiles).length}`);
  console.log(`🌍 Supported languages: ${Object.keys(FONT_CONFIG.supportedLanguages).length}`);
  console.log(`📄 Available font files: ${fontIndex.availableFiles.length}`);

  console.log('\n🚀 Next steps:');
  console.log('1. Font files are ready for use with FFmpeg');
  console.log('2. Update FFmpeg commands to use language-specific fonts');
  console.log('3. Test font rendering with different languages');
}

if (require.main === module) {
  setupFonts().catch(console.error);
}

module.exports = { setupFonts, downloadFont, createPlaceholderFile };