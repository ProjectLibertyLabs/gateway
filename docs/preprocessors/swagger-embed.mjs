// Debugging Help
// Use console.error, not console.log
//
// Runs openapi-to-md when `{{#swagger-embed ../services/account/swagger.json}}` or other is found

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert';

function runNpxCommand(script, args) {
  try {
    const command = `npx -y ${script} -- ${args.map((x) => `"${x}"`).join(' ')}`;
    const output = execSync(command, { encoding: 'utf-8' });
    return output;
  } catch (error) {
    throw new Error(`Error executing npx command: ${error}`);
  }
}

function swaggerEmbed(chapter) {
  const regex = /{{#swagger-embed\s(.+?)}}/g;
  const matches = [...chapter.content.matchAll(regex)];
  matches.forEach((match) => {
    const swaggerFile = match[1];
    assert(existsSync(swaggerFile), `Unable to find ${swaggerFile}`);
    const output = runNpxCommand('openapi-to-md', [swaggerFile]);
    const replaceWith = output
      .split('\n')
      // Remove the default header
      .slice(5)
      // This hack fixes the markdown issue that mdBook headers support classes which breaks
      // with some params lines: https://rust-lang.github.io/mdBook/format/markdown.html#heading-attributes
      .map((line) => (line.startsWith('#') ? line + '{}' : line))
      .join('\n');
    chapter.content = chapter.content.replace(match[0], replaceWith);
  });
  if (chapter.sub_items) {
    chapter.sub_items.forEach((section) => {
      section.Chapter && swaggerEmbed(section.Chapter);
    });
  }
}

// Function to perform the preprocessing
function preprocessMdBook([_context, book]) {
  // Swagger Embed
  book.sections.forEach((section) => {
    section.Chapter && swaggerEmbed(section.Chapter);
  });

  // Output the processed content in mdbook preprocessor format
  process.stdout.write(JSON.stringify(book));
}

if (process.argv < 3) {
  throw new Error('Something strange is happening');
}

if (process.argv[2] === 'supports') {
  process.exit(0);
}

process.stdin.setEncoding('utf-8');
process.stdout.setEncoding('utf-8');

// Read data from stdin
let inputData = '';

process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', () => {
  preprocessMdBook(JSON.parse(inputData));
});
