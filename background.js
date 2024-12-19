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
  const OPENAI_API_KEY = ""; // Add your API key here
  const requestBody = {
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `First find in this image the programming language selected (most likely python). Then, solve the problem shown in this 
            image and provide the simplest and shortest solution in such language with proper formatting. You should only provide 
            the code well commented and nothing else. Write a simple, step-by-step, beginner-friendly solution that avoids shortcuts 
            and built-in functions (often forbidden in interviews). Focus on clarity, using explicit logic, easy-to-follow code, 
            and no overly clever tricks.. Follow this format for each language: 
            \`\`\`python
            <code here>
            // Start first line with a comment explaining very concisely what the code will do. 
            // Ex: We will first make make a function that loops through the array and returns the sum of all elements using i++.
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
