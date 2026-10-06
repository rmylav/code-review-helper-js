import path from "node:path";
import { parseArgs } from "node:util";

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
  console.error(error.code, error.message);
  process.exit(1);
}

console.log(values);
const valuesArray = [values.staged, values.branch, values.file];
const scoreCount = valuesArray.filter((s) => s).length;
if (scoreCount > 1) {
  console.error(
    "ERROR: more than one value set, use only one of --staged, --branch or --file",
  );
  process.exit(1);
}
