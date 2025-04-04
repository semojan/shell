const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execSync, execFileSync } = require('child_process');

const builtin = ["cd", "echo", "exit", "pwd", "type"];
let lastCompletion = { prefix: "", count: 0, hits: [] };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer: (line) => {
    let executables = new Set(builtin);
    const path = process.env.PATH.split(":");

    path.forEach((dir) => {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => executables.add(file));
      } catch (err) {
        // Ignore errors reading directories
      }
    });

    const hits = [...executables].filter((c) => c.startsWith(line.trim())).sort();
    const longestPrefix = getLongestCommonPrefix(hits);

    if (longestPrefix && longestPrefix !== "" && longestPrefix !== line) {
      return [[longestPrefix], line];
    }

    if (lastCompletion.prefix === line) {
      lastCompletion.count++;
    } else {
      lastCompletion.prefix = line.trim();
      lastCompletion.count = 1;
      lastCompletion.hits = hits;
    }

    if (line.trim() === "") {
      return [builtin, line];
    }

    if (hits.length === 0) {
      process.stdout.write("\x07"); // Bell sound
      return [[], line];
    } else if (hits.length === 1) {
      lastCompletion.count = 0;
    }

    if (lastCompletion.count === 1) {
      process.stdout.write("\x07"); // Bell sound
      return [[], line];
    } else if (lastCompletion.count === 2) {
      console.log();
      console.log(hits.join("  "));
      console.log("$ " + line);
      prompt();
      return [[], line];
    }

    return [hits.map(c => c = c + " "), line];
  }
});

function getLongestCommonPrefix(strings) {
  if (!strings.length) return "";
  if (strings.length === 1) return "";

  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }

  const isUseful = strings.some(str => str === prefix);
  return isUseful ? prefix : "";
}


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

  const output = parseQuotedString(text);

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
    const stderrOutput = error.stderr ? error.stderr.toString().trim() : error.message.trim();

    return { isFile: true, fileResult: stdoutOutput, errorMessage: stderrOutput, isError: true };
  }
}

function handleRedirect(result, args, type) {
  let index = 0;
  if (type === 1) {
    index = args.findIndex(arg => [">", "1>"].includes(arg));
  } else if (type === 2) {
    index = args.findIndex(arg => ["2>"].includes(arg));
  } else if (type === 3) {
    index = args.findIndex(arg => [">>", "1>>"].includes(arg));
  } else if (type === 4) {
    index = args.findIndex(arg => ["2>>"].includes(arg));
  }
  if (index !== -1 && index + 1 < args.length) {
    const filePath = args[index + 1];
    try {
      if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf-8').trim() !== "") {
        result = "\n" + result;
      }
      fs.writeFileSync(filePath, result, { flag: type === 3 || type === 4 ? "a" : "w" });
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
    const append = args.includes(">>") || args.includes("1>>");
    const append2 = args.includes("2>>");

    let index = 0;

    if (redirect) {
      index = args.findIndex(arg => arg === ">" || arg === "1>");
      args = args.slice(0, index);
    } else if (redirect2) {
      index = args.findIndex(arg => arg === "2>");
      args = args.slice(0, index);
    } else if (append) {
      index = args.findIndex(arg => arg === ">>" || arg === "1>>");
      args = args.slice(0, index);
    } else if (append2) {
      index = args.findIndex(arg => arg === "2>>");
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
      // let { isFile, fileResult, errorMessage: errMsg, isError: errFlag } = handleFile("ls " + args.join(" "));
      // errorMessage = errMsg;
      // isError = errFlag;

      let { isFile, fileResult } = handleFile(answer);
      if (!isFile) {
        result = `${answer}: command not found`;
      } else {
        result = fileResult;
      }

    }

    if (redirect && result !== null) {
      handleRedirect(result, answer.split(" "), 1);
    } else if (append && result !== null) {
      handleRedirect(result, answer.split(" "), 3);
    }

    if ((redirect && errorMessage) || (append && errorMessage)) {
      console.log(errorMessage);
    }

    if (redirect2) {
      handleRedirect(errorMessage ? errorMessage : "", answer.split(" "), 2);
    } else if (append2) {
      handleRedirect(errorMessage ? errorMessage : "", answer.split(" "), 4);
    }

    if ((redirect2 && result !== "") || (append2 && result !== "")) {
      console.log(result);
    }

    if (result !== null && !redirect2 && !redirect && !append && !append2) {
      console.log(result);
    }

    prompt();
  });
}

prompt();