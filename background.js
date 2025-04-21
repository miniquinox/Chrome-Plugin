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
        console.log("GPT Response:", result);
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
  const OPENAI_API_KEY = "API Here"; // Add your API key here

  const requestBody = {
    // model: "o4-mini",
    model: "gpt-4.1",
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: `First find in this image the programming language selected (most likely python). Then, solve the problem shown in this 
              image and provide the simplest and shortest solution in such language with proper formatting. You should only provide 
              the code well commented and nothing else. Write a simple, step-by-step, beginner-friendly solution that avoids shortcuts 
              and built-in functions (often forbidden in interviews). Make sure to always follow instructions on how to write the code 
              specifically if given. Focus on clarity, using explicit logic, easy-to-follow code, and no overly clever tricks. This is a 
              coding interview question, so be sure to provide a solution that is easy to understand and implement. Write the time and 
              space complexity of the solution at the end of the code as comments with concise explanation. Wrap all comments and code 
              to 60 characters per line.  
              Follow this format for each language: 
              \`\`\`python
              <code here>
              // Start first line with a comment explaining very concisely what the code will do. 
              // Ex: We will first make a function that loops through the array and returns the sum of all elements using i++.
              \`\`\``
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: imageUrl
          },
          {
            type: "input_text",
            text: "Solve this challenge"
          }
        ]
      }
    ],
    text: {
      format: {
        type: "text"
      }
    },
    // reasoning: {
    //   effort: "high"
    // },
    tools: [],
    temperature: 1,
    max_output_tokens: 14877,
    top_p: 1,
    store: false
  };

  try {
    console.log("Sending image to GPT API via fetch...");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("API response status:", response.status);
    if (!response.ok) {
      const error = await response.json();
      console.error("Error response from GPT API:", error);
      throw new Error(JSON.stringify(error, null, 2));
    }

    const data = await response.json();
    console.log("GPT API response data:", data);

    // Extract the assistant's response from the output array
    if (!data.output || !Array.isArray(data.output)) {
      throw new Error("Invalid response structure: Missing 'output' array.");
    }

    const assistantMessage = data.output.find((msg) => msg.role === "assistant");
    if (!assistantMessage || !assistantMessage.content || !Array.isArray(assistantMessage.content)) {
      throw new Error("Invalid response structure: Missing assistant message content.");
    }

    const outputText = assistantMessage.content.find((item) => item.type === "output_text");
    if (!outputText || !outputText.text) {
      throw new Error("Invalid response structure: Missing text content in assistant message.");
    }

    return outputText.text;
  } catch (error) {
    console.error("Error during GPT API call:", error.message || error);
    throw error;
  }
}
