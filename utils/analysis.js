const axios = require("axios");

// Helper function to fetch file content and calculate total lines
async function getTotalLines(file) {
  try {
    const response = await axios.get(file.raw_url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    const content = response.data;
    return content.split("\n").length; // Total lines in the file
  } catch (error) {
    console.error(
      `Error fetching file content for ${file.filename}:`,
      error.message
    );
    return 0; // Default to 0 if content cannot be fetched
  }
}

// Helper function to count functions (traditional + arrow)
function countFunctions(patch) {
  const traditional = patch.match(/function\s+\w+\s*\(/g) || [];
  const arrow = patch.match(/(const|let|var)\s+\w+\s*=\s*\(.*?\)\s*=>/g) || [];
  return traditional.length + arrow.length;
}

// Detect TODO/FIXME comments
function detectTodos(patch) {
  const todos = [];
  if (patch) {
    const todoMatches = patch.match(/(TODO|FIXME):?\s*(.*)/gi);
    if (todoMatches) {
      todos.push(...todoMatches);
    }
  }
  return todos;
}

// Analyze PR files
async function analyzeFiles(files) {
  const warnings = [];

  // Filter JS/TS files
  const jsFiles = files.filter(
    (file) =>
      file.filename.endsWith(".js") ||
      file.filename.endsWith(".jsx") ||
      file.filename.endsWith(".ts") ||
      file.filename.endsWith(".tsx")
  );

  // If no relevant code files, skip analysis
  if (jsFiles.length === 0) {
    console.log(
      "🛑 No JavaScript/TypeScript files changed in this PR. Skipping analysis."
    );
    return null; // Or return empty array [] if your caller expects that
  }

  // Check LOC and NOM for JS/TS files only
  for (const file of jsFiles) {
    const totalLines = await getTotalLines(file);

    if (totalLines > 200) {
      warnings.push(`⚠️ File "${file.filename}" exceeds 200 lines of code.`);
    }

    if (file.patch && countFunctions(file.patch) > 8) {
      warnings.push(`⚠️ File "${file.filename}" has more than 8 methods.`);
    }
  }

  // Check package.json vs package-lock.json (always check this regardless of language)
  const packageJsonModified = files.some((f) => f.filename === "package.json");
  const packageLockModified = files.some(
    (f) => f.filename === "package-lock.json"
  );

  if (packageJsonModified && !packageLockModified) {
    warnings.push(
      `⚠️ 📦 "package.json" was modified but "package-lock.json" was not updated.`
    );
  }

  return warnings;
}

module.exports = { analyzeFiles, detectTodos };
