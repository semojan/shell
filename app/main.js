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
  let quotedCmd = [];
  let fileName = "";
  let args = [];
  let quoted = false;

  if (answer.startsWith("'")) {
    quotedCmd = answer.split("'");
    quotedName = seperateQuotedFileName(quotedCmd, "'")
    quoted = true;
  } else if (answer.startsWith('"')) {
    quotedCmd = answer.split('"');
    quotedName = seperateQuotedFileName(quotedCmd, '"');
    quoted = true;
  }

  if (quoted) {
    fileName = parseQuotedString(quotedName);
    args = quotedCmd.slice(2);
  } else {
    fileName = answer.split(" ")[0];
    args = answer.split(fileName + " ")[1];
  }

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

  if (filePath) {
    let output = "";
    if (fileName === "cat") {
      output = execSync(answer).toString().trim();
    } else {
      const destinationPath = path.join(filePath, fileName);
      output = execFileSync(destinationPath, args, { encoding: 'utf-8', stdio: 'inherit', argv0: fileName });
    }

    return { isFile: true, fileResult: output };
  }
  return { isFile: false, fileResult: null };
}

function prompt() {
  rl.question("$ ", (answer) => {

    let result = null;
    if (answer === "exit 0") {
      handleExit();
    } else if (answer.startsWith("cd ")) {

      const inPath = answer.split("cd ")[1];
      result = handleCd(inPath);

    } else if (answer.startsWith("echo ")) {

      const text = answer.split("echo ")[1];
      result = handleEcho(text);

    } else if (answer === "pwd") {

      result = handlePwd();

    } else if (answer.startsWith("type")) {

      const command = answer.split("type ")[1];
      result = handleType(command);

    } else {
      let { isFile, fileResult } = handleFile(answer);
      if (!isFile) {
        result = `${answer}: command not found`;
      } else {
        result = fileResult;
      }
    }

    result && console.log(result);

    prompt();
  });
}

prompt();