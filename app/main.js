const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["cd", "echo", "exit", "pwd", "type"];

function handleCd(inPath) {

  if (inPath === "~"){
    inPath = process.env.HOME || "/home/user";
  }

  const newPath = path.resolve(process.cwd(), inPath);
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()){
    process.chdir(newPath);
  } else {
    console.log(`cd: ${newPath}: No such file or directory`);
  }

}

function handleEcho(text) {

  if (text.startsWith("'") && text.endsWith("'")){
    text = text.replaceAll("'", "");
  }

  text = text.replaceAll(/\s+/g , " ");

  console.log(text);
}

function handleExit() {
  exit(0);
}

function handlePwd (){
  console.log(process.cwd());
}

function handleType(command) {
  if (builtin.includes(command)) {
    console.log(`${command} is a shell builtin`);
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
      console.log(`${command} is ${finalPath}`);
    } else {
      console.log(`${command}: not found`);
    }

  }
}

function handleFile(answer){
  const fileName = answer.split(" ")[0];
  const args = answer.split(" ").slice(1);
  const paths = process.env.PATH.split(":");

  for (const p of paths) {
    const filePath = path.join(p, fileName);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        execFileSync(fileName, args, { encoding: 'utf-8', stdio: 'inherit' });
      return true;
    } else {
      return false;
    }
  }
}

function prompt() {
  rl.question("$ ", (answer) => {

    if (answer === "exit 0") {
      handleExit();
    } else if(answer.startsWith("cd ")) {

      const inPath = answer.split("cd ")[1];
      handleCd(inPath);

    } else if (answer.startsWith("echo ")) {

      const text = answer.split("echo ")[1];
      handleEcho(text);

    } else if (answer === "pwd"){

      handlePwd();

    } else if (answer.startsWith("type")) {

      const command = answer.split("type ")[1];

      handleType(command);

    } else {
      let isFile = handleFile(answer);
      if(!isFile){
        console.log(`${answer}: command not found`);
      }
    }

    prompt();
  });
}

prompt();