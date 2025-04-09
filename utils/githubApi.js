const axios = require("axios");

// Load environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Fetch all PR files with pagination
async function fetchAllPRFiles(prFilesUrl) {
  const allFiles = [];
  let page = 1;
  const perPage = 100; // GitHub API supports up to 100 items per page

  try {
    while (true) {
      const response = await axios.get(prFilesUrl, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        params: {
          page,
          per_page: perPage,
        },
      });

      const files = response.data;
      if (files.length === 0) break; // No more files to fetch

      allFiles.push(...files);
      page++;
    }
  } catch (error) {
    console.error("Error fetching PR files:", error.message);
    throw error;
  }

  return allFiles;
}

// Post a comment on the PR
async function postComment(prNumber, comment) {
  const REPO_OWNER = process.env.REPO_OWNER;
  const REPO_NAME = process.env.REPO_NAME;

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${prNumber}/comments`;
  await axios.post(
    url,
    { body: comment },
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
}

module.exports = { fetchAllPRFiles, postComment };
