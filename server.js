
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

const server = http.createServer((req, res) => {
  if (req.url === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "online",
      app: "CyberShield 360"
    }));
  }

  let file = req.url === "/" ? "index.html" : req.url.split("?")[0].slice(1);
  const filePath = path.join(PUBLIC, path.normalize(file));

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("File not found");
    }

    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CyberShield 360 running on port ${PORT}`);
});
    
