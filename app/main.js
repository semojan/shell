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
      execFileSync(filePath, args, { encoding: "utf-8", stdio: "inherit", argv0: executable });
      return { isFile: true, fileResult: null };
    } catch (error) {
      return { isFile: false, fileResult: `Error executing ${executable}` };
    }
  }

  return { isFile: false, fileResult: null };
}

function handleCat(answer) {
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

  if (filePath) {
    output = execSync(answer).toString().trim();
    return { isFile: true, fileResult: output };
  }
  return { isFile: false, fileResult: null };
}

function handleRedirect(result, args) {
  const index = args.findIndex(arg => arg === ">" || arg === "1>");
  if (index !== -1 && index + 1 < args.length) {
    const filePath = args[index + 1];
    try {
      fs.writeFileSync(filePath, result, { flag: "w" });
      console.log(`Output redirected to ${filePath}`);
    } catch (error) {
      console.error(`Error writing to file: ${error.message}`);
    }
  }
}

function prompt() {
  rl.question("$ ", (answer) => {

    const args = answer.split(" ").slice(1);
    const redirect = args.includes(">") || args.includes("1>");

    if (redirect) {
      const index = args.findIndex(arg => arg === ">" || arg === "1>");
      args = args.slice(0, index);
    }

    let result = null;
    if (answer === "exit 0") {
      handleExit();
    } else if (answer.startsWith("cat ")) {

      // result = handleCat(answer.split("cat ")[1]);
      let { isFile, fileResult } = handleCat("cat " + args.join(" "));
      if (!isFile) {
        result = `${answer}: command not found`;
      } else {
        result = fileResult;
      }

    } else if (answer.startsWith("cd ")) {

      const inPath = answer.split("cd ")[1];
      result = handleCd(inPath);

    } else if (answer.startsWith("echo ")) {

      // const text = answer.split("echo ")[1];
      result = handleEcho(args.slice(1));

    } else if (answer === "pwd") {

      result = handlePwd();

    } else if (answer.startsWith("type")) {

      // const command = answer.split("type ")[1];
      result = handleType(args.slice(1));

    } else {
      let { isFile, fileResult } = handleFile(args.join(" "));
      if (!isFile) {
        result = `${answer}: command not found`;
      } else {
        result = fileResult;
      }
    }

    if (redirect) {
      result = handleRedirect(result, args);
    }

    result && console.log(result);

    prompt();
  });
}

prompt();