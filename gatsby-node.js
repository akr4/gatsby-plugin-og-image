const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { removeTrailingSlash } = require('./utils');
const async = require('async');

const WIDTH = 1200;
const HEIGHT = 630;

const OG_IMAGE_DIR = './public/og-image';

let browser;
let jobQueue;

exports.onPreInit = async ({ reporter }, { concurrency }) => {
  browser = await puppeteer.launch();

  const run = async ({ html, path }, callback) => {
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: WIDTH, height: HEIGHT });
      await page.setContent(html);
      await page.screenshot({ path });
      reporter.info(`wrote og:image to ${path}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
    callback();
  };

  jobQueue = async.queue(run, concurrency);
};

exports.onPostBuild = async () => {
  await browser.close();
};

exports.onCreatePage = async ({ page, actions }, { siteUrl, render }) => {
  const { createPage, deletePage } = actions;
  const ogImagePluginContext = page.context.ogImagePlugin;

  if (!ogImagePluginContext) {
    return;
  }

  const html = render(ogImagePluginContext);

  const ogImagePath = path.join(OG_IMAGE_DIR, removeTrailingSlash(page.path) + '.png');

  if (fs.existsSync(ogImagePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(ogImagePath), { recursive: true });
  await createOgImage(html, ogImagePath);

  const ogImageUrl = removeTrailingSlash(siteUrl) + '/og-image' + removeTrailingSlash(page.path) + '.png';

  deletePage(page);

  const newContext = {
    ...page.context,
    ogImageUrl,
  };
  delete newContext.ogImagePlugin;

  const newPage = {
    ...page,
    context: newContext,
  };

  createPage(newPage);
};

const createOgImage = (html, path) => {
  return new Promise(resolve => {
    jobQueue.push({ html, path }, () => resolve());
  });
};
