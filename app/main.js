const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(){
  rl.question("$ ", (answer) => {
    console.log(`${answer}: command not found\n`);
    // rl.close();
    prompt();
  });
}

prompt();