// Debugging Help
// Use console.error, not console.log
//
// Embeds SVG with a correct wrapping:
// - Replaces `{{#svg-embed ../image.svg title}}` with the contents of the svg wrapped in <div class="svg-embed" title="[title]">[contents]</div>

import { readFileSync } from "node:fs";

function svgEmbed(chapter) {
  const regex = /{{#svg-embed\s(.+?)\s(.+?)}}/g;
  const matches = [...chapter.content.matchAll(regex)];
  matches.forEach((match) => {
    const svgFileLight = match[1];
    const svgFileDark = match[1].replace(".svg", "-Dark.svg");
    const titleTag = match[2];
    const svgOutputLight = readFileSync(svgFileLight, "utf8");
    const svgOutputDark = readFileSync(svgFileDark, "utf8");
    const replaceWith = [
      `<div class="svg-embed-light" title="${titleTag}">${svgOutputLight}</div>`,
      `<div class="svg-embed-coal" title="${titleTag}">${svgOutputDark}</div>`,
    ].join("\n");
    chapter.content = chapter.content.replace(match[0], replaceWith);
  });
  if (chapter.sub_items) {
    chapter.sub_items.forEach((section) => {
      section.Chapter && svgEmbed(section.Chapter);
    });
  }
}

// Function to perform the preprocessing
function preprocessMdBook([_context, book]) {
  // SVG Embed
  book.sections.forEach((section) => {
    section.Chapter && svgEmbed(section.Chapter);
  });

  // Output the processed content in mdbook preprocessor format
  process.stdout.write(JSON.stringify(book));
}

if (process.argv < 3) {
  throw new Error("Something strange is happening");
}

if (process.argv[2] === "supports") {
  process.exit(0);
}

process.stdin.setEncoding("utf-8");
process.stdout.setEncoding("utf-8");

// Read data from stdin
let inputData = "";

process.stdin.on("data", (chunk) => {
  inputData += chunk;
});

process.stdin.on("end", () => {
  preprocessMdBook(JSON.parse(inputData));
});
