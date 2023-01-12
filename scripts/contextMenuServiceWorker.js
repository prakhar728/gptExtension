// Function to get + decode API key
const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log(tabs);
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};
const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

// New function here
const generateCompletionAction = async (info) => {
  try {
    // Send mesage with generating text (this will be like a loading indicator)
    sendMessage("generating...");
    const { selectionText } = info;
    const basePromptPrefix = `
        Give a background of the characters mentioned here:
        
         Characters:
         `;

    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );

    // Add your second prompt here
    const secondPrompt = `
        Take the characters and their background story given and the outline and write a full anime story for it. Don't make it sad, make it powerful and use the background for each character too!
         Characters:${selectionText}
         Background:${baseCompletion}
      
        `;

    // Call your second prompt
    const secondPromptCompletion = await generate(secondPrompt);
    console.log(secondPromptCompletion);

    // Send the output when we're all done
    sendMessage(secondPromptCompletion.text);
  } catch (error) {
    console.log(error);
    sendMessage(error.toString());
  }
};

// Don't touch this
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "context-run",
    title: "Generate the Anime Storyline",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
