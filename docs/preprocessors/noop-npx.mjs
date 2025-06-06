// Debugging Help
// Use console.error, not console.log
//
// A script that runs an npx command
// - The script must be the first argument to the script
// - The script must start with "npx -y"
// - The script MUST NOT include a & or |

import { execSync } from "node:child_process";

function runNpxCommand(script, args) {}

// Function to perform the preprocessing
function preprocessMdBook([_context, book]) {
  try {
    const command = process.argv[2];
    if (!command.startsWith("npx -y")) {
      throw new Error(`NPX argument MUST start with "npx -y" and be the first argument to the script. "${command}"`);
    }
    if (command.includes("&") || command.includes("|")) {
      throw new Error(`NPX argument MUST NOT run anything else like "|" or "&". "${command}"`);
    }
    const output = execSync(command, { encoding: "utf-8" });
    // Write any output back to the error, for logging.
    // DO NOT use stdout as that adds to the book output.
    process.stderr.write(output);
  } catch (error) {
    throw new Error(`Error executing npx command: ${error}`);
  }

  // Output the processed content in mdbook preprocessor format
  process.stdout.write(JSON.stringify(book));
}

if (process.argv < 4) {
  throw new Error("Something strange is happening");
}

if (process.argv[3] === "supports") {
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
