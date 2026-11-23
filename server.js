
const http = require("http");
const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, "http://localhost");
  const pathname = parsed.pathname;

  if (pathname === "/api/health") {
    return send(res, 200, {
      status: "online",
      app: "CyberShield 360"
    });
  }

  if (pathname === "/api/url-check" && req.method === "POST") {
    try {
      const { url } = await readBody(req);
      let parsedUrl;

      try {
        parsedUrl = new URL(url);
      } catch {
        return send(res, 400, {
          error: "Invalid URL format."
        });
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return send(res, 400, {
          error: "Only HTTP and HTTPS URLs are supported."
        });
      }

      const warnings = [];

      if (parsedUrl.protocol !== "https:") {
        warnings.push("The website does not use HTTPS.");
      }

      if (parsedUrl.username || parsedUrl.password) {
        warnings.push("The URL contains embedded login information.");
      }

      if (parsedUrl.hostname.includes("xn--")) {
        warnings.push("The domain uses internationalized encoding.");
      }

      if (/^\\d{1,3}(\\.\\d{1,3}){3}$/.test(parsedUrl.hostname)) {
        warnings.push("The URL uses an IP address instead of a domain.");
      }

      if (parsedUrl.hostname.split(".").length > 5) {
        warnings.push("The domain has many subdomains.");
      }

      return send(res, 200, {
        message: warnings.length
          ? "Warning: Review this URL carefully."
          : "No obvious URL warning was detected.",
        warnings,
        note: "This is a basic heuristic check, not a guarantee that a website is safe. The server does not visit the URL."
      });
    } catch (error) {
      return send(res, 400, { error: error.message });
    }
  }

  if (pathname === "/api/email-check" && req.method === "GET") {
    const domain = (parsed.searchParams.get("domain") || "").toLowerCase();

    if (
      domain.length > 253 ||
      !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(domain)
    ) {
      return send(res, 400, { error: "Enter a valid domain name." });
    }

    try {
      const [mx, txt, dmarc] = await Promise.allSettled([
        dns.resolveMx(domain),
        dns.resolveTxt(domain),
        dns.resolveTxt("_dmarc." + domain)
      ]);

      const txtRecords = txt.status === "fulfilled"
        ? txt.value.map(parts => parts.join(""))
        : [];

      const dmarcRecords = dmarc.status === "fulfilled"
        ? dmarc.value.map(parts => parts.join(""))
        : [];

      return send(res, 200, {
        domain,
        mx: mx.status === "fulfilled" ? mx.value : [],
        spf: txtRecords.filter(record => record.toLowerCase().startsWith("v=spf1")),
        dmarc: dmarcRecords.filter(record => record.toLowerCase().startsWith("v=dmarc1")),
        note: "DNS record lookup only. DKIM requires a provider-specific selector."
      });
    } catch {
      return send(res, 500, { error: "DNS lookup failed." });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return send(res, 405, { error: "Method not allowed." });
  }

  let filePath;

  try {
    const requested = decodeURIComponent(pathname);
    const relative = requested === "/" ? "index.html" : requested.slice(1);
    filePath = path.resolve(PUBLIC, relative);
  } catch {
    res.writeHead(400);
    return res.end("Bad request");
  }

  if (!filePath.startsWith(PUBLIC + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("File not found");
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
    });

    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("CyberShield 360 running on port " + PORT);
});
        
