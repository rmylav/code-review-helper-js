# Code Review Helper (Node.js)

## How it works

1. Grabs a diff (from git or a file)
2. Sends it to Claude with a system prompt that tells it how to review code
3. Prints the review back to your terminal

## Requirements

- Node.js 20.12 or later (uses `process.loadEnvFile`, `import.meta.dirname`, and `util.parseArgs`)
- git
- An Anthropic API key scoped to a workspace

## Setup

```bash
git clone https://github.com/rmylav/code-review-helper-js
cd code-review-helper-js
npm install
```

Create a `.env` file in the project folder:

```
ANTHROPIC_API_KEY=your-key-here
```

Install the `review-code` command globally (symlinked to this folder):

```bash
npm link
```

To remove it later: `npm unlink -g code-review-helper`

## Usage

Run from inside any git repository:

```bash
review-code                    # review unstaged changes (git diff)
review-code --staged           # review staged changes
review-code --branch main      # review the diff against another branch
review-code --file x.diff      # review a diff saved in a file
review-code > review.md        # save the review; progress messages still show on screen
```

Use only one of `--staged`, `--branch`, or `--file` at a time.

### Exit codes

| Code | Meaning                                                                |
| ---- | ---------------------------------------------------------------------- |
| `0`  | Review printed, or there were no changes to review                     |
| `1`  | Something failed: bad arguments, git error, missing file, or API error |

## Improvements over the original Python version

This is a hand-written Node.js port of a Python script (`review.py`) that was originally generated with AI assistance. The rewrite kept the same core flow and changed the following:

**Conflicting flags fail fast instead of being silently ignored.**
The Python version accepted `--file x.diff --branch main` and quietly used the file, because precedence was implied by the order of `if` checks. That can produce a confident review of the wrong changes. This version rejects any combination of `--staged`, `--branch`, and `--file` with a clear error.

**The API key is loaded from a per-project `.env`, resolved relative to the script.**
The original relied on a global `ANTHROPIC_API_KEY` shell export. This version reads `.env` from the script's own folder using `import.meta.dirname`, not from the current working directory. That matters because the tool runs from inside _other_ repos: a relative `.env` path would resolve against the wrong project and could pick up the wrong key. It also keeps working when the command is invoked through the `npm link` symlink.

**Branch names starting with `-` are rejected.**
Running git with an argument array (no shell) prevents shell injection, but git still parses its own arguments, so a value like `--branch=--output=/tmp/x` would be read as a git option. Neither version was vulnerable to shell injection; this version also guards against this argument injection.

**A missing `--file` path gives a clean error.**
The Python version called `open()` without handling, so a bad path ended in a traceback. This version reports `No file found at <path>` and exits with code 1.

**Status messages and results go to separate streams.**
Progress and error messages go to stderr, and only the review goes to stdout. The original printed its status line with `print`, so redirecting output to a file put that line into the saved review.

**API errors are handled by type.**
The original checked only for a non-200 status, so network failures and timeouts raised uncaught exceptions. This version uses the Anthropic SDK's error classes, with specific messages for an invalid key, an unknown model, and a network failure, plus a generic fallback. Errors that aren't from the API are rethrown rather than misreported. The SDK also retries transient failures automatically.

**Truncated reviews are flagged.**
If the response hits the token limit, the model's output stops mid-sentence and the request still succeeds. The original never checked for this. This version still prints the partial review, then warns on stderr that it was truncated.

## Known limitations

## Possible next steps
