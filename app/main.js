const readline = require("readline");
const { exit } = require("process");
const path = require("path");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["echo", "exit", "type"];

function handleEcho(text) {
  console.log(text);
}

function handleExit() {
  exit(0);
}

function handleType(command) {
  if (builtin.includes(command)) {
    console.log(`${command} is a shell builtin`);
  } else {

    let exists;
    let finalPath;

    const paths = process.env.PATH.split(":");

    for (let p of paths) {
      const commandPath = path.join(p, command);
      if (fs.existsSync(commandPath) && fs.statSync(commandPath).isFile()) {
        exists = true;
        finalPath = commandPath;
      }
    }

    if (exists) {
      console.log(`${command} is ${finalPath}`);
    } else {
      console.log(`${command}: not found`);
    }

  }
}

function prompt() {
  rl.question("$ ", (answer) => {

    if (answer === "exit 0") {
      handleExit();
    } else if (answer.startsWith("echo ")) {

      const text = answer.split("echo ")[1];
      handleEcho(text);

    } else if (answer.startsWith("type")) {

      const command = answer.split("type ")[1];

      handleType(command);

    } else {
      console.log(`${answer}: command not found`);
    }

    prompt();
  });
}

prompt();