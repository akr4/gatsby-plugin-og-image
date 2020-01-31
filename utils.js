const fs = require('fs');
const path = require('path');

const OG_IMAGE_DIR = './public/og-image';

exports.findOgImageForPagePath = pagePath => {
  const ogImagePath = path.join(OG_IMAGE_DIR, removeTrailingSlash(pagePath) + '.png');
  if (fs.existsSync(ogImagePath)) {
    return ogImagePath;
  } else {
    return null;
  }
};

const removeTrailingSlash = s => {
  if (s.endsWith('/')) {
    return s.slice(0, s.length - 1);
  } else {
    return s;
  }
};

exports.removeTrailingSlash = removeTrailingSlash;
