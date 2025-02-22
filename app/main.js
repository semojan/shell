const readline = require("readline");
const { exit } = require("process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(){
  rl.question("$ ", (answer) => {
    if (answer === "exit 0"){
      exit(0);
    }
    console.log(`${answer}: command not found`);
    prompt();
  });
}

prompt();