document.getElementById("submitButton").addEventListener("click", async () => {
  const textInput = document.getElementById("textInput").value;
  const responseElement = document.getElementById("response");

  if (!textInput) {
    responseElement.textContent = "Please enter some text.";
    return;
  }

  responseElement.textContent = "Loading...";

  const apiKey = await getApiKey();

  if (!apiKey) {
    responseElement.textContent =
      "API key not found. Please configure the API key.";
    return;
  }

  try {
    const response = await callOpenAI(textInput, apiKey);
    responseElement.textContent = response.choices[0].text;
  } catch (error) {
    console.error(error);
    responseElement.textContent =
      "Error: Failed to fetch response from the API.";
  }
});

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (result) => {
      resolve(result.apiKey || "");
    });
  });
}

async function callOpenAI(text, apiKey) {
  const url = "https://api.openai.com/v1/engines/text-davinci-003/completions";
  const prompt = `Text: ${text}\n\nResponse:`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      max_tokens: 100,
      n: 1,
      stop: null,
      temperature: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return await response.json();
}
