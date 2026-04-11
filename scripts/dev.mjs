import { spawn } from "node:child_process";

const serverPort = process.env.SERVER_PORT || "8787";

function run(cmd, args, extraEnv) {
  return spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });
}

const server = run("node", ["server/index.js"], { PORT: serverPort, NODE_ENV: "development" });
const client = run("vite", [], { VITE_API_ORIGIN: `http://localhost:${serverPort}` });

function shutdown(code = 0) {
  server.kill("SIGINT");
  client.kill("SIGINT");
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

server.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});
client.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});