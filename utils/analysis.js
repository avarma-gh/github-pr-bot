const axios = require("axios");
const { fetchFileContentFromGitHub } = require("./githubApi");
const { compareDependencies } = require("./dependencies");

// Fetch total number of lines in a file
async function getTotalLines(file) {
  try {
    const response = await axios.get(file.raw_url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    return response.data.split("\n").length;
  } catch (error) {
    console.error(
      `Error fetching file content for ${file.filename}:`,
      error.message
    );
    return 0;
  }
}

// Count traditional and arrow functions in patch
function countFunctions(patch) {
  const traditional = patch.match(/function\s+\w+\s*\(/g) || [];
  const arrow = patch.match(/(const|let|var)\s+\w+\s*=\s*\(.*?\)\s*=>/g) || [];
  return traditional.length + arrow.length;
}

// Detect TODO and FIXME comments in patch
function detectTodos(patch) {
  const todos = [];
  if (patch) {
    const matches = patch.match(/(TODO|FIXME):?\s*(.*)/gi);
    if (matches) todos.push(...matches);
  }
  return todos;
}

// Analyze files changed in PR
async function analyzeFiles(files, repoFullName, baseSha, headSha) {
  const warnings = [];

  // Filter for JS/TS files only
  const jsFiles = files.filter((file) =>
    [".js", ".jsx", ".ts", ".tsx"].some((ext) => file.filename.endsWith(ext))
  );

  if (jsFiles.length === 0) {
    console.log("No JS/TS files found. Skipping analysis.");
    return null;
  }

  // JS/TS file analysis
  for (const file of jsFiles) {
    const totalLines = await getTotalLines(file);

    if (totalLines > 200) {
      warnings.push(`File \`${file.filename}\` exceeds 200 lines.`);
    }

    if (file.patch && countFunctions(file.patch) > 8) {
      warnings.push(`File \`${file.filename}\` has more than 8 functions.`);
    }
  }

  // Check for package.json changes without package-lock.json
  const packageJsonChanged = files.some((f) => f.filename === "package.json");
  const packageLockChanged = files.some(
    (f) => f.filename === "package-lock.json"
  );

  if (packageJsonChanged && !packageLockChanged) {
    warnings.push(
      `\`package.json\` was changed, but \`package-lock.json\` was not updated.`
    );

    const basePkg = await fetchFileContentFromGitHub(
      repoFullName,
      baseSha,
      "package.json"
    );
    const headPkg = await fetchFileContentFromGitHub(
      repoFullName,
      headSha,
      "package.json"
    );

    if (basePkg && headPkg) {
      const depChanges = compareDependencies(
        basePkg.dependencies,
        headPkg.dependencies
      );
      const devDepChanges = compareDependencies(
        basePkg.devDependencies,
        headPkg.devDependencies
      );

      const allChanges = [...depChanges, ...devDepChanges];
      if (allChanges.length > 0) {
        warnings.push("Dependency changes detected:");
        warnings.push(...allChanges);
      }
    }
  }

  return warnings;
}

module.exports = {
  analyzeFiles,
  detectTodos,
};
