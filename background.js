chrome.commands.onCommand.addListener((command) => {
  if (command === "take-screenshot") {
    console.log("Shortcut triggered: Taking screenshot...");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab) {
        console.error("No active tab found.");
        return;
      }

      console.log("Active tab:", activeTab);

      // Inject content script dynamically
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          files: ["content.js"],
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error injecting content script:",
              chrome.runtime.lastError.message
            );
            return;
          }

          console.log("Content script injected.");
          // Capture screenshot and send it to the content script
          chrome.tabs.captureVisibleTab(null, {}, (image) => {
            if (!image) {
              console.error("Failed to capture image.");
              return;
            }

            console.log("Screenshot captured successfully.");
            chrome.tabs.sendMessage(
              activeTab.id,
              { action: "process-screenshot", image },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending message to content script:",
                    chrome.runtime.lastError.message
                  );
                } else {
                  console.log("Response from content script:", response);
                }
              }
            );
          });
        }
      );
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message in background.js:", message);
  if (message.action === "send-to-gpt") {
    analyzeImageWithGPT(message.image)
      .then((result) => {
        console.log("GPT-4 Vision Response:", result);
        sendResponse({ success: true, reply: result });
        chrome.tabs.sendMessage(
          sender.tab.id,
          { action: "display-response", reply: result },
          () => {
            console.log("Response sent to content script.");
          }
        );
      })
      .catch((error) => {
        console.error("Error analyzing image:", error.message || error);
        sendResponse({ success: false, error: error.message || error });
      });
    return true; // Keeps the message channel open for async response
  }
});

async function analyzeImageWithGPT(imageUrl) {
  const OPENAI_API_KEY = "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"; // Replace with your actual API key

  const requestBody = {
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Solve the problem shown in this image and provide the simplest solution in Swift code
            with proper formatting. You should only provide the code well commented and nothing else.
            Focus on easy to digest code, simple and concise. 
            This is an interview, so don't use built in functions that are usually forbidden. Follow this format: 
            \`\`\`swift
            <code here>
            // Start first line with a comment explaining very concisely what the code does. 
            // Ex: make variables with let, loop through the array, check if the element is greater than 5, etc.
            \`\`\`
            `,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
  };

  try {
    console.log("Sending image to GPT-4 Vision API via fetch...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ ...requestBody, max_tokens: 1000 }), // Set max token limit
    });

    console.log("API response status:", response.status);
    if (!response.ok) {
      const error = await response.json();
      console.error("Error response from GPT-4 Vision API:", error);
      throw new Error(JSON.stringify(error, null, 2));
    }

    const data = await response.json();
    console.log("GPT-4 Vision response data:", data);
    return data.choices[0].message.content || "No response from GPT-4 Vision.";
  } catch (error) {
    console.error("Error during GPT-4 Vision API call:", error.message || error);
    throw error;
  }
}
