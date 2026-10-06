import path from "node:path";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

//console.log("API Key loaded successfully");
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

//console.log(values);
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
  console.log("empty diff");
  process.exit(0);
} else {
  console.log("Diff:", diff.trim().length);
}

// execFile call
