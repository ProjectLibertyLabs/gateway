// Debugging Help
// Use console.error, not console.log
//
// This does two things:
// - Runs openapi-to-md when `{{#swagger-embed ../services/account/swagger.json}}` or other is found
// - Replaces `{{#button-links}}` with the child links of that page in button form

import { execSync } from 'child_process';

function runNpxCommand(script, args) {
  try {
    const command = `npx -y ${script} -- ${args.map(x => `"${x}"`).join(" ")}`;
    const output = execSync(command, { encoding: 'utf-8' });
    return output;
  } catch (error) {
    throw new Error(`Error executing npx command: ${error}`);
  }
}

function makeButtonLink({ Chapter }, parentPath) {
  // Remove any part of the path that the parent already has.
  // This assumes that there are no nested duplicate names
  const path = Chapter.path.split("/").filter((x) => !parentPath.has(x));
  return `<a href="${path.join("/").replace(".md", ".html")}">${Chapter.name}</a>`;
}

function generateButtonLinks(parent) {
  // Remove the last /page.md as there might be collisions with that part
  const parentPath = new Set(parent.path.replace(/\/[^\/]*$/, "").split("/"));
  return (
    '<div class="button-links">' + parent.sub_items.map((x) => makeButtonLink(x, parentPath)).join("\n") + "</div>"
  );
}
function replaceButtonLinks(chapter) {
  if (chapter.sub_items && chapter.content.includes("{{#button-links}}")) {
    chapter.content = chapter.content.replace("{{#button-links}}", generateButtonLinks(chapter));
  }

  if (chapter.sub_items) {
    chapter.sub_items.forEach((section) => {
      section.Chapter && replaceButtonLinks(section.Chapter);
    });
  }
}

function swaggerEmbed(chapter) {
  const regex = /{{#swagger-embed\s(.+?)}}/;
  const match = chapter.content.match(regex);
  if (match) {
    const swaggerFile = match[1];
    const output = runNpxCommand("openapi-to-md", [swaggerFile]);
    const replaceWith = output.split("\n").slice(5).join("\n");
    chapter.content = chapter.content.replace(match[0], replaceWith);
  }
  if (chapter.sub_items) {
    chapter.sub_items.forEach((section) => {
      section.Chapter && swaggerEmbed(section.Chapter);
    });
  }
}

// Function to perform the preprocessing
function preprocessMdBook([_context, book]) {
  // Button Links
  book.sections.forEach((section) => {
    section.Chapter && replaceButtonLinks(section.Chapter);
  });

  // Swagger Embed
  book.sections.forEach((section) => {
    section.Chapter && swaggerEmbed(section.Chapter);
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
