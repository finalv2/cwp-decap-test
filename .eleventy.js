import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import markdownIt from "markdown-it";
import markdownLibrary from "./markdown.js";
import svgSprite from "eleventy-plugin-svg-sprite";
import eleventyAutoCacheBuster from "eleventy-auto-cache-buster";
import dateFilters from './filters/dateFilters.js'
import CleanCSS from "clean-css";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import removeMarkdown from "remove-markdown";


// Alphabetically sort lists and collections
const alphaSort = (a, b) => {
  if (a.data.title < b.data.title) {
    return -1;
  } else if (a.data.title > b.data.title) {
    return 1;
  } else {
    return 0;
  }
};


export default async function(eleventyConfig) {
  eleventyConfig.addPlugin(eleventyAutoCacheBuster);

  eleventyConfig.addNunjucksFilter("cssmin", code => {
    return new CleanCSS({}).minify(code).styles;
  });

  eleventyConfig.addPassthroughCopy("./favicon.ico");
  eleventyConfig.addPassthroughCopy("./favicon.svg");
  eleventyConfig.addPassthroughCopy("./favicon-180.png");
  eleventyConfig.addPassthroughCopy("./favicon-192.png");
  eleventyConfig.addPassthroughCopy("./favicon-512.png");
  eleventyConfig.addPassthroughCopy("./open-graph.jpg");
  eleventyConfig.addPassthroughCopy("./site.webmanifest");

  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    // output image formats
    formats: ["avif", "webp", "jpeg"],

    // output image widths
    widths: ["auto"],

    // optional, attributes assigned on <img> nodes override these values
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
      },
      pictureAttributes: {}
    },
  });

  eleventyConfig.addPassthroughCopy("./fonts/");
  eleventyConfig.addPassthroughCopy("./images/");
  eleventyConfig.addPassthroughCopy("./js/");
  eleventyConfig.addPassthroughCopy("./admin/");

  eleventyConfig.addDataExtension("yml", (contents) => yaml.load(contents));

  const md = markdownIt({
    html: true,
    breaks: false,
    linkify: true,
  }).disable(['code']);

  eleventyConfig.setLibrary('md', markdownLibrary);

  eleventyConfig.addNunjucksFilter("md", (markdownString) =>
    md.render(markdownString),
    );

  eleventyConfig.addPlugin(svgSprite, {
    path: "./icons", // relative path to SVG directory
    svgShortcode: "icon"
  });

  // Human-readable dates

  Object.keys(dateFilters).forEach(filterName => {
      eleventyConfig.addFilter(filterName, dateFilters[filterName])
  })

  // All strategies sorted alphabetically
  eleventyConfig.addCollection("strategiesAlpha", (collection) =>
    collection.getFilteredByGlob("strategies/*.md").sort(alphaSort)
  );

  // Get list of topics
  const getTopics =  () => {
    const topics = fs.readdirSync("./topics/").filter((file) => {
      const filePath = path.join("./topics/", file);
      return fs.statSync(filePath).isFile();
    });

    const dsStoreIndex = topics.indexOf(".DS_Store");
    topics.splice(topics[dsStoreIndex], 1);

    topics.forEach((topic, i) => {
      // Remove file extension
      topics[i] = topic.replace(/\.[^/.]+$/, "");
    });

    topics.push("noTopic");

    return topics;
  };

  const topicList = getTopics();

  for (const topic in topicList) {
    eleventyConfig.addCollection(`${topicList[topic]}-strategies`, collectionsApi => {
      return collectionsApi.getFilteredByTags('strategy', `${topicList[topic]}`).sort((a, b) => a.data.order - b.data.order);
    });

    eleventyConfig.addCollection(`${topicList[topic]}-stories`, collectionsApi => {
      return collectionsApi.getFilteredByTags('story', `${topicList[topic]}`).sort((a, b) => a.data.order - b.data.order);
    });

    eleventyConfig.addCollection(`${topicList[topic]}-resources`, collectionsApi => {
      return collectionsApi.getFilteredByTags('resource', `${topicList[topic]}`).sort((a, b) => a.data.order - b.data.order);
    });

    eleventyConfig.addCollection(`${topicList[topic]}-dashboards`, collectionsApi => {
      return collectionsApi.getFilteredByTags('dashboard', `${topicList[topic]}`).sort((a, b) => a.data.order - b.data.order);
    });
  }

  // Stories
  eleventyConfig.addCollection("stories", (collection) =>
    collection.getFilteredByGlob("stories/*.md")
  );

    // All resources
  eleventyConfig.addCollection("topics", (collection) =>
      collection.getFilteredByGlob("topics/*.md").sort((a, b) => a.data.order - b.data.order)
  );

  // All resources
  eleventyConfig.addCollection("resources", (collection) =>
      collection.getFilteredByGlob("resources/*.md")
  );

  eleventyConfig.addCollection("meetings", (collection) =>
      collection.getFilteredByGlob("meetings/*.md")
  );

  eleventyConfig.addFilter("find", function find(collection = [], title = "") {
    return collection.find(item => item.data.title === title);
  });

  // Resources featured on homepage

  eleventyConfig.addCollection("homeResources", (collection) =>
    collection.getFilteredByTags("homepage", "resource")
  );


  // Borrowed from https://www.williamkillerud.com/blog/blog-post-excerpts-in-11ty/
  // to generate automatic meta descriptions for some page types

  eleventyConfig.setFrontMatterParsingOptions({
    excerpt: (file) => {
      // I use https://www.npmjs.com/package/remove-markdown here,
      // but you can bring your own de-markdownifier.
      const plaintext = removeMarkdown(file.content).trim();

      // End the description at a period (inclusive) or newline (not)
      // somewhere around the approximate length.
      const approximateLength = 170;
      let dot = plaintext.indexOf(".", approximateLength) + 1;
      let newline = plaintext.indexOf("\n", approximateLength);

      // Avoid substringing to the empty string
      if (dot === -1) dot = plaintext.length;
      if (newline === -1) newline = plaintext.length;

      file.excerpt = plaintext.substring(0, Math.min(dot, newline));
    },
  });

}