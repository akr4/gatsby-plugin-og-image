const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { removeTrailingSlash } = require('./utils');
const async = require('async');
const isEqual = require('lodash.isequal');

const OG_IMAGE_DIR = './public/og-image';

let browser;
let jobQueue;

exports.onPreInit = async ({ reporter }, { concurrency = 3, width = 1200, height = 630 }) => {
  browser = await puppeteer.launch();

  const run = async ({ html, path }, callback) => {
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width, height });
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

exports.onCreatePage = async ({ page, cache, actions }, { siteUrl, render }) => {
  const { createPage, deletePage } = actions;
  const ogImagePluginContext = page.context.ogImagePlugin;

  if (!ogImagePluginContext) {
    return;
  }

  const html = render(ogImagePluginContext);

  const ogImagePath = path.join(OG_IMAGE_DIR, removeTrailingSlash(page.path) + '.png');

  const cachedContext = await cache.get(page.path);
  if (isEqual(cachedContext, ogImagePluginContext)) {
    return;
  }

  fs.mkdirSync(path.dirname(ogImagePath), { recursive: true });
  await createOgImage(html, ogImagePath);
  await cache.set(page.path, ogImagePluginContext);

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
