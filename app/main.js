const readline = require("readline");
const { exit } = require("process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtin = ["echo", "exit", "type"];

function prompt() {
  rl.question("$ ", (answer) => {
    const [command, text] = answer.split(" ");
    console.log(text)

    if (answer === "exit 0") {
      exit(0);
    } else if (answer.startsWith("echo ")) {
      const text = answer.split("echo ");
      console.log(text[1]);
    } else if (answer.startsWith("type")) {
      const command = answer.split("type ")[1];
      if (builtin.includes(command)){
        console.log(`${command} is a shell builtin`);
      } else {
        console.log(`${command}: not found`);
      }
    } else {
      console.log(`${answer}: command not found`);
    }

    prompt();
  });
}

prompt();