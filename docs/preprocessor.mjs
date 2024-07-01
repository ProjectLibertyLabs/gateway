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

// Function to perform the preprocessing
function preprocessMdBook([_context, book]) {
  book.sections.forEach((section) => {
    section.Chapter && replaceButtonLinks(section.Chapter);
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
