const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execSync, execFileSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type"];

function parseQuotedString(text) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false
  let output = "";

  const escapeSequences = ["\\", "$", '"', "\n"];

  for (let i = 0; i < text.length; i++) {
    let char = text[i];

    if (escaped) {
      output += char;
      escaped = false;
    } else if ((char === "\\" && !inSingleQuote) || (char === "\\" && inDoubleQuote && escapeSequences.includes(text[i + 1]))) {
      escaped = true;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else {
      if (inSingleQuote || inDoubleQuote || char !== " ") {
        output += char;
      } else {
        if (output[output.length - 1] !== " ") {
          output += " ";
        }
      }
    }
  }

  return output;
}

function handleCd(inPath) {

  if (inPath === "~") {
    inPath = process.env.HOME || "/home/user";
  }

  const newPath = path.resolve(process.cwd(), inPath);
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    process.chdir(newPath);
    return null;
  } else {
    return `cd: ${newPath}: No such file or directory`;
  }

}

function handleEcho(text) {

  // const hasSingleQuote = text.startsWith("'");
  // const slices = hasSingleQuote ? text.split("'") : text.split('"');
  // const n = slices.length;
  // if (n >= 3 && slices[0] === "" && slices[n - 1] === "") {
  //   return slices.slice(1, n - 1).map(item => item !== "" && item.trim() === "" ? " " : item).join("");
  // }

  const output = parseQuotedString(text);
  // text = text.replace(/\s+/g, " ");

  return output;
}

function handleExit() {
  exit(0);
}

function handlePwd() {
  return process.cwd();
}

function handleType(command) {
  if (builtin.includes(command)) {
    return `${command} is a shell builtin`;
  } else {

    let exists = false;
    let finalPath = null;

    const paths = process.env.PATH.split(":");

    for (const p of paths) {
      const commandPath = path.join(p, command);
      if (fs.existsSync(commandPath) && fs.statSync(commandPath).isFile()) {
        exists = true;
        finalPath = commandPath;
        break;
      }
    }

    if (exists) {
      return `${command} is ${finalPath}`;
    } else {
      return `${command}: not found`;
    }
  }
}

function seperateQuotedFileName(quotedCmd, quote) {
  let n = quotedCmd.length;
  let quotedName = quotedCmd.slice(0, n - 1).join(quote) + quote;
  return quotedName;
}

function handleFile(answer) {
  let match = answer.match(/^(['"])(.*?)\1\s*(.*)/); // Capture quoted executable and arguments

  let executable;
  let args = [];

  if (match) {
    executable = match[2]; // Extract quoted executable
    args = match[3] ? match[3].split(/\s+/) : []; // Remaining arguments
  } else {
    let parts = answer.split(/\s+/);
    executable = parts[0];
    args = parts.slice(1);
  }

  // Search for executable in PATH
  const paths = process.env.PATH.split(":");
  let filePath = null;

  for (const p of paths) {
    let pToCheck = path.join(p, executable);
    if (fs.existsSync(pToCheck) && fs.statSync(pToCheck).isFile()) {
      filePath = pToCheck;
      break;
    }
  }

  if (filePath) {
    try {
      const output = execFileSync(filePath, args, { encoding: "utf-8", stdio: "inherit", argv0: executable });
      return { isFile: true, fileResult: output, isError: false, errorMessage: null };
    } catch (error) {
      const stdoutOutput = error.stdout ? error.stdout.toString().trim() : "";
      const stderrOutput = error.stderr ? error.stderr.toString().trim() : "";

      return { isFile: true, fileResult: stdoutOutput, errorMessage: stderrOutput, isError: true };
    }
  }

  return { isFile: false, fileResult: null };
}

function handleExternal(answer, redirect) {
  const fileName = answer.split(" ")[0];
  const args = answer.split(fileName + " ")[1];
  const paths = process.env.PATH.split(":");

  let filePath;
  for (const p of paths) {
    // pToCheck = path.join(p, fileName);
    if (fs.existsSync(p) && fs.readdirSync(p).includes(fileName)) {
      // execFileSync(fileName, args, { encoding: 'utf-8', stdio: 'inherit' });
      filePath = p;
      break;
    } else {
      filePath = null;
    }
  }

  let output = null;

  try {
    output = execSync(answer, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).toString().trim();
    return { isFile: true, fileResult: output, isError: false, errorMessage: null };
  } catch (error) {
    const stdoutOutput = error.stdout ? error.stdout.toString().trim() : "";
    const stderrOutput = error.stderr ? error.stderr.toString().trim() : "";

    return { isFile: true, fileResult: stdoutOutput, errorMessage: stderrOutput, isError: true };
  }
}

function handleRedirect(result, args, type) {
  let index = 0;
  if (type === 1) {
    index = args.findIndex(arg => [">", "1>"].includes(arg));
  } else if (type === 2) {
    index = args.findIndex(arg => ["2>"].includes(arg));
  }

  if (index !== -1 && index + 1 < args.length) {
    const filePath = args[index + 1];
    try {
      fs.writeFileSync(filePath, result, { flag: "w" });
      return null;
    } catch (error) {
      return `${filePath}: No such file or directory`
    }
  }
  return false;
}

function prompt() {
  rl.question("$ ", (answer) => {

    let args = answer.split(" ").slice(1);
    const redirect = args.includes(">") || args.includes("1>");
    const redirect2 = args.includes("2>");

    if (redirect) {
      const index = args.findIndex(arg => arg === ">" || arg === "1>");
      args = args.slice(0, index);
    } else if (redirect2) {
      const index = args.findIndex(arg => arg === "2>");
      args = args.slice(0, index);
    }

    let result = null;
    let errorMessage = null;
    let isError = false;

    if (answer === "exit 0") {
      handleExit();
    } else if (answer.startsWith("cat ")) {

      let { fileResult, errorMessage: errMsg, isError: errFlag } = handleExternal("cat " + args.join(" "));
      result = fileResult;
      errorMessage = errMsg;
      isError = errFlag;

    } else if (answer.startsWith("cd ")) {

      const inPath = answer.split("cd ")[1];
      result = handleCd(inPath);

    } else if (answer.startsWith("echo ")) {

      // const text = answer.split("echo ")[1];
      result = handleEcho(args.join(" "));

    } else if (answer.startsWith("ls ")) {

      let { fileResult, errorMessage: errMsg, isError: errFlag } = handleExternal("ls " + args.join(" "));
      result = fileResult;
      errorMessage = errMsg;
      isError = errFlag;

    } else if (answer === "pwd") {

      result = handlePwd();

    } else if (answer.startsWith("type")) {

      // const command = answer.split("type ")[1];
      result = handleType(args.join(" "));

    } else {
      let { isFile, fileResult, errorMessage: errMsg, isError: errFlag } = handleFile("ls " + args.join(" "));
      result = fileResult;
      errorMessage = errMsg;
      isError = errFlag;
      if (!isFile) {
        result = `${answer}: command not found`;
      } else {
        result = fileResult;
      }
    }

    if (redirect && result !== null) {
      handleRedirect(result, answer.split(" "), 1);
    } else if (!redirect2 && errorMessage) {
      console.log(errorMessage);
    }

    if (redirect2) {
      handleRedirect(errorMessage ? errorMessage : "", answer.split(" "), 2);
    }

    if (redirect2 && resul !== null) {
      console.log(result);
    }

    if (!redirect && !redirect2 && result !== null) {
      console.log(result);
    }

    prompt();
  });
}

prompt();