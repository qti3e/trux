import { Server } from "./api.ts";

const server = new Server();
server.get("/", (req, res) => {
  res.write("Hello World");
  console.log("/");
});

server.get("/hi", (req, res) => {
  console.log("/hi");
  res.end();
});

server.get("/hi/:r", req => {
  console.log("/hi/" + req.parameters.r);
  console.log(req.parameters);
  console.log(req);
});

server.use((req, res) => {
  // TODO(qti3e) Think about handling errors!
  console.log("404");
  res.write("");
});

server.listen("0.0.0.0:8080");
