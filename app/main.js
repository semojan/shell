const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type"];

function handleCd(inPath) {

  if (inPath === "~") {
    inPath = process.env.HOME || "/home/user";
  }

  const newPath = path.resolve(process.cwd(), inPath);
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    process.chdir(newPath);
    return;
  } else {
    return `cd: ${newPath}: No such file or directory`;
  }

}

function handleEcho(text) {

  const hasSingleQuote = text.startsWith("'");
  const slices = hasSingleQuote ? text.split("'") : text.split('"');
  const n = slices.length;
  if (n >= 3 && slices[0] === "" && slices[n - 1] === "") {
    return slices.slice(1, n - 1).map(item => item !== "" && item.trim() === "" ? " " : item).join("");
  }

  // if (text.startsWith("'") && text.endsWith("'")){
  //   text = text.replaceAll("'", "");
  //   console.log(text);
  //   return;
  // }

  text = text.replaceAll(/\s+/g, " ");

  return text;
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
    return { isFile: true, result: output };
  }
  return { isFile: false, result: null };
}

function prompt() {
  rl.question("$ ", (answer) => {

    let result = "";
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

    console.log(result);

    prompt();
  });
}

prompt();