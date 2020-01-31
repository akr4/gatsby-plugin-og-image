const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { removeTrailingSlash } = require('./utils');
const async = require('async');
const isEqual = require('lodash.isequal');

const PLUGIN_NAME = '@akr4/gatsby-plugin-og-image';
const OG_IMAGE_DIR = './public/og-image';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;

let browser;
let jobQueue;
let readyToRun = false;

const checkConfig = (reporter, siteUrl, render) => {
  if (!siteUrl) {
    reporter.error(`${PLUGIN_NAME}: no siteUrl option in the plugin config`);
    return;
  }
  if (!render) {
    reporter.error(`${PLUGIN_NAME}: no render option in the plugin config`);
    return;
  }

  readyToRun = true;
};

exports.onPreInit = async ({ reporter }, { siteUrl, render, concurrency = 3, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT }) => {
  checkConfig(reporter, siteUrl, render);
  if (!readyToRun) {
    return;
  }

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
  if (!readyToRun) {
    return;
  }

  await browser.close();
};

exports.onCreatePage = async ({ page, cache, reporter, actions }, { siteUrl, render, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT}) => {
  if (!readyToRun) {
    return;
  }

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
    ogImageWidth: width,
    ogImageHeight: height,
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
