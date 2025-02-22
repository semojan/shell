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
    } else if (answer.startsWith( "echo " )) {
      const text = answer.split("echo ");
      console.log(text[1]);
    } else {
      console.log(`${answer}: command not found`);
    }

    prompt();
  });
}

prompt();