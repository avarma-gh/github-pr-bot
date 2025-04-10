const crypto = require("crypto");
const { fetchAllPRFiles, postComment } = require("./githubApi");
const { analyzeFiles, detectTodos } = require("./analysis");

// Verify webhook payload
function verifySignature(rawBody, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  const computedSignature = `sha256=${hmac.update(rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  );
}

// Webhook handler
async function handleWebhook(req, res) {
  const rawBody = req.rawBody;
  const payload = req.body;
  const signature = req.headers["x-hub-signature-256"];
  const event = req.headers["x-github-event"];

  // Null check for required headers
  if (!signature) {
    console.error("Missing x-hub-signature-256 header");
    return res.status(400).send("Missing signature header");
  }

  // Verify webhook signature
  if (!verifySignature(rawBody, signature, process.env.WEBHOOK_SECRET)) {
    console.error("Invalid signature");
    return res.status(401).send("Invalid signature");
  }

  try {
    // Null check for pull_request object
    if (!payload.pull_request) {
      console.error("Missing pull_request object in payload");
      return res.status(400).send("Invalid payload: Missing pull_request");
    }

    const pr = payload.pull_request;
    const prNumber = pr.number || "Unknown"; // Fallback for missing PR number
    const prUrl = pr.url || ""; // Fallback for missing PR URL
    const senderLogin = payload.sender?.login || "Unknown User"; // Fallback for missing sender login

    // Fetch PR files with pagination
    const files = await fetchAllPRFiles(prUrl + "/files");

    // Analyze files
    const warnings = await analyzeFiles(files);

    // Detect TODO/FIXME comments
    const todos = files.flatMap((file) => detectTodos(file.patch));
    if (todos.length > 0) {
      warnings.push(`Found TODO/FIXME comments:\n${todos.join("\n")}`);
    }

    // Post feedback as a PR comment
    if (warnings && warnings.length > 0) {
      const comment = `Hi @${senderLogin}, here are some suggestions to improve your PR:\n\n${warnings.join(
        "\n"
      )}`;
      await postComment(prNumber, comment);
    } else {
      await postComment(prNumber, "✅ Great job! Your PR looks good.");
    }

    res.status(200).send("Feedback posted");
  } catch (error) {
    console.error("Error processing PR:", error.message);
    res.status(500).send("Internal server error");
  }
}

module.exports = { handleWebhook };
