import path from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6"; //keep this pinned; update deliberately when you want a newer model

const REVIEW_SYSTEM_PROMPT = `You are an experienced, pragmatic senior software engineer doing a code review.

Review the given git diff and provide feedback focused on:
1. Bugs or logic errors
2. Security issues
3. Style/readability problems (but don't nitpick trivial things)
4. Risky changes that deserve extra test coverage

Be concise and specific. Reference file names and line context from the diff.
If the diff looks fine, say so briefly — don't invent issues to seem thorough.
Format your response in clear markdown with sections and bullet points.`;

const pathAbs = import.meta.dirname; //current folder path

const envPath = path.join(pathAbs, ".env"); //append .env to get path for env file

try {
  process.loadEnvFile(envPath); //read Key value into process.env
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(`No .env found at ${envPath}`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC API KEY not found, did you assign it?");
  process.exit(1);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      staged: { type: "boolean" },
      branch: { type: "string" },
      file: { type: "string" },
    },
  }));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const valuesArray = [values.staged, values.branch, values.file];
const scoreCount = valuesArray.filter((s) => s).length;
if (scoreCount > 1) {
  console.error(
    "ERROR: more than one value set, use only one of --staged, --branch or --file",
  );
  process.exit(1);
}
let diff;
const argArray = ["diff"];
const cmd = "git";

if (values.file) {
  try {
    diff = readFileSync(values.file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`No file found at ${values.file}`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
} else {
  if (values.branch) {
    if (values.branch.startsWith("-")) {
      console.error(
        `Invalid branch name "${values.branch}": cannot start with "-"`,
      );
      process.exit(1);
    }
    argArray.push(values.branch);
  } else if (values.staged) {
    argArray.push("--staged");
  }

  try {
    diff = execFileSync(cmd, argArray, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error("Git isn't installed");
    } else {
      console.error("Git diff failed");
    }
    process.exit(1);
  }
}

if (diff.trim().length === 0) {
  console.error(
    "No changes found to review. Use --staged if you've staged your changes, or --branch <name> to diff against another branch.",
  );
  process.exit(0);
}
const client = new Anthropic();
console.error("Sending diff to Claude for review...\n");
const response = await client.messages.create({
  model: MODEL,
  max_tokens: 2000,
  system: REVIEW_SYSTEM_PROMPT,
  messages: [
    {
      role: "user",
      content: `Please review this diff: \n\n\`\`\`diff\n${diff}\n\`\`\``,
    },
  ],
});

const result = response.content
  .filter((res) => res.type === "text")
  .map((res) => res.text)
  .join("\n");
console.log(result);
