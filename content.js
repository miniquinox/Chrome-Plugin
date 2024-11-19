chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content.js:", message);
  if (message.action === "process-screenshot") {
    showFloatingWindow(message.image);
    sendToGPT(message.image); // Automatically send the screenshot to GPT
  }
});

function showFloatingWindow(image) {
  console.log("Displaying floating window...");
  const existing = document.getElementById("floating-window");
  if (existing) existing.remove();

  const floatingWindow = document.createElement("div");
  floatingWindow.id = "floating-window";
  floatingWindow.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 500px;
    background: white;
    z-index: 10000;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    padding: 10px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    color: #333;
  `;

  const img = document.createElement("img");
  img.src = image;
  img.style.cssText = `
    width: 100%;
    height: auto;
    object-fit: contain;
    border: 1px solid #ccc;
    border-radius: 5px;
    margin-bottom: 10px;
  `;

  const responseContainer = document.createElement("div");
  responseContainer.id = "gpt-response";
  responseContainer.style.cssText = `
    margin-top: 10px;
    padding: 5px;
    background: #f9f9f9;
    border: 1px solid #ccc;
    border-radius: 3px;
    height: auto;
    max-height: 500px;
    overflow-y: auto;
    font-family: 'Courier New', monospace;
  `;
  responseContainer.innerHTML = "<i>Analyzing the problem... Please wait.</i>";

  const closeButton = document.createElement("button");
  closeButton.innerText = "X";
  closeButton.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: red;
    color: white;
    border: none;
    border-radius: 3px;
    width: 20px;
    height: 20px;
    font-size: 10px;
    cursor: pointer;
  `;
  closeButton.addEventListener("click", () => {
    console.log("Closing floating window...");
    floatingWindow.remove();
  });

  floatingWindow.appendChild(closeButton);
  floatingWindow.appendChild(img);
  floatingWindow.appendChild(responseContainer);
  document.body.appendChild(floatingWindow);
  console.log("Floating window displayed.");
}

function sendToGPT(image) {
  console.log("Sending image to GPT...");
  const responseContainer = document.getElementById("gpt-response");
  responseContainer.innerHTML = "<i>Analyzing the problem... Please wait.</i>"; // Show a loading message

  chrome.runtime.sendMessage(
    { action: "send-to-gpt", image },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        responseContainer.innerHTML = `<span style="color: red;">Runtime Error: ${chrome.runtime.lastError.message}</span>`;
      } else if (response && response.success) {
        console.log("GPT response:", response.reply);
        responseContainer.innerHTML = formatCode(response.reply);

        // Highlight code using Prism.js
        loadPrism().then(() => Prism.highlightAll());
      } else {
        console.error("Error in response:", response);
        responseContainer.innerHTML = `<span style="color: red;">Error: ${response.error}</span>`;
      }
    }
  );
}

function formatCode(code) {
  // Extract language from code block (e.g., ```python, ```swift, etc.)
  const match = code.match(/```(\w+)[\s\S]*?```/);
  const language = match ? match[1] : "plaintext";

  // Remove markdown code fences
  code = code.replace(/```(\w+)?|```/g, "");

  // Escape HTML special characters
  code = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Wrap the code in a <pre><code> block for Prism.js syntax highlighting
  return `<pre><code class="language-${language}">${code}</code></pre>`;
}

function loadPrism() {
  return new Promise((resolve) => {
    if (document.getElementById("prism-css") || document.getElementById("prism-js")) {
      return resolve(); // Skip if already loaded
    }

    // Load CSS
    const css = document.createElement("link");
    css.id = "prism-css";
    css.rel = "stylesheet";
    css.href = chrome.runtime.getURL("libs/prism.css");
    document.head.appendChild(css);

    // Load JS
    const js = document.createElement("script");
    js.id = "prism-js";
    js.src = chrome.runtime.getURL("libs/prism.js");
    js.onload = resolve;
    document.head.appendChild(js);
  });
}
