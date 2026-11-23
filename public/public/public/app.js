
async function checkUrl() {
  const url = document.getElementById("url").value.trim();
  const result = document.getElementById("url-result");

  if (!url) {
    result.textContent = "Please enter a URL.";
    return;
  }

  result.textContent = "Checking...";

  try {
    const response = await fetch("/api/url-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    result.textContent = data.message || data.error || "Check completed.";
  } catch {
    result.textContent = "Unable to connect to the server.";
  }
}

async function checkDomain() {
  const domain = document.getElementById("domain").value.trim();
  const result = document.getElementById("domain-result");

  if (!domain) {
    result.textContent = "Enter a domain.";
    return;
  }

  result.textContent = "Checking DNS records...";

  try {
    const response = await fetch(
      "/api/email-check?domain=" + encodeURIComponent(domain)
    );

    const data = await response.json();
    result.textContent = JSON.stringify(data, null, 2);
  } catch {
    result.textContent = "Unable to connect to the server.";
  }
}

function checkPassword() {
  const password = document.getElementById("password").value;
  const result = document.getElementById("password-result");

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    "Very weak",
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very strong"
  ];

  result.textContent = "Password strength: " + levels[score];
}
