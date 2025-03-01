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
  // let quotedCmd = [];
  // let executable = "";
  // let args = [];
  // let quoted = false;

  // if (answer.startsWith("'")) {
  //   quotedCmd = answer.split("'");
  //   quotedName = seperateQuotedFileName(quotedCmd, "'")
  //   quoted = true;
  // } else if (answer.startsWith('"')) {
  //   quotedCmd = answer.split('"');
  //   quotedName = seperateQuotedFileName(quotedCmd, '"');
  //   quoted = true;
  // }

  // if (quoted) {
  //   executable = parseQuotedString(quotedName);
  //   args = quotedCmd.slice(2).filter(arg => arg.trim() !== "");
  // } else {
  //   // executable = answer.split(" ")[0];
  //   // args = answer.split(executable + " ")[1];
  //   let parts = answer.split(/\s+/);
  //   executable = parts[0];
  //   args = parts.slice(1);
  // }

  // const paths = process.env.PATH.split(":");
  // let filePath = null;

  // for (const p of paths) {
  //   let pToCheck = path.join(p, executable);
  //   // if (fs.existsSync(p) && fs.readdirSync(p).includes(executable)) {
  //   //   // execFileSync(executable, args, { encoding: 'utf-8', stdio: 'inherit' });
  //   //   filePath = pToCheck;
  //   //   break;
  //   // }
  //   if (fs.existsSync(pToCheck) && fs.statSync(pToCheck).isFile()) {
  //     filePath = pToCheck;
  //     break;
  //   }
  // }

  // for (const p of paths) {
  //   let destPath = path.join(p, executable);
  //   if (fs.existsSync(destPath) && fs.statSync(destPath).isFile()) {
  //     execFileSync(destPath, args, { encoding: "utf-8", stdio: "inherit", argv0: executable });
  //     return { isFile: true, fileResult: null };
  //   }
  // }

  // return { isFile: false, fileResult: null };

  // if (!filePath && fs.existsSync(executable) && fs.statSync(executable).isFile()) {
  //   filePath = executable;
  // }

  // if (!filePath) {
  //   return { isFile: false, fileResult: null };
  // }

  // try {
  //   const output = execFileSync(filePath, args, { encoding: "utf-8", stdio: 'inherit', shell: true }).trim();
  //   return { isFile: true, fileResult: output };
  // } catch (error) {
  //   return { isFile: false, fileResult: null };
  // }

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

// function handleCat(args) {
//   if (args.length === 0) {
//     return "cat: missing file operand";
//   }
//   for (const filePath of args) {
//     try {
//       const data = fs.readFileSync(filePath, "utf-8");
//       return data;
//     } catch (err) {
//       if (err.code === "ENOENT") {
//         return `cat: ${filePath}: No such file or directory`;
//       } else {
//         return `cat: ${filePath}: Permission denied`;
//       }
//     }
//   }
// }
function handleCat(args) {
  if (!args.trim()) {
    return "cat: missing file operand";
  }

  // Match arguments while preserving quoted filenames
  let parsedArgs = args.match(/(?:[^\s"']+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')+/g);
  if (!parsedArgs) return "cat: missing file operand";

  parsedArgs = parsedArgs.map(arg =>
    arg.replace(/^["']|["']$/g, "").replace(/\\(["'])/g, "$1") // Remove outer quotes & unescape quotes
  );

  let output = "";
  for (const filePath of parsedArgs) {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      output += data;
    } catch (err) {
      if (err.code === "ENOENT") {
        return `cat: ${filePath}: No such file or directory`;
      } else {
        return `cat: ${filePath}: Permission denied`;
      }
    }
  }

  return output;
}

function prompt() {
  rl.question("$ ", (answer) => {

    let result = null;
    if (answer === "exit 0") {
      handleExit();
    } else if (answer.startsWith("cat ")) {

      result = handleCat(answer.split("cat ")[1]);

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