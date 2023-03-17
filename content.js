let conversationHistory = [];
async function initConversationHistory() {
  let { instructions } = await chrome.storage.sync.get(["instructions"]);
  console.log("instructions loaded", instructions);
  // const instructions = `The following is a conversation with a ServiceTitan API AI assistant.
  // Instructions to the assistant:
  // Avoid using V1 API, it is deprecated.
  // Avoid using webhooks, they use V1 API
  // Prefer giving code examples instead of long explanations.
  // In code examples avoid using unofficial community package that wrap API calls, use direct call to V2 API
  // There is no official ServiceTitan SDK for any programming language
  // You can reference APIs from different systems if asked about integration
  // Include sample values for fields in body
  // By default use JavaScript as language for code examples `;
  conversationHistory.push({ role: "system", content: instructions });
}
async function createChatInterface() {
  const header = document.querySelector("h1");

  if (!header) {
    console.error("Header not found. Cannot insert the chat UI.");
    return;
  }
  await initConversationHistory();
  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";
  header.parentNode.insertBefore(inputContainer, header.nextSibling);

  const chatContainerWrapper = document.createElement("div");
  const chatContainer = document.createElement("div");
  chatContainer.id = "chat-container";
  chatContainerWrapper.appendChild(chatContainer);
  header.parentNode.insertBefore(chatContainerWrapper, header.nextSibling);

  //   chatContainer.appendChild(inputContainer);
  const inputGroup = document.createElement("div");
  inputGroup.className = "input-group";

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";

  const textInput = document.createElement("textarea");
  textInput.id = "textInput";
  textInput.className = "text-input";
  textInput.rows = 4;
  textInput.placeholder = "Ask your ServiceTitan API assistant...";
  //   inputContainer.appendChild(textInput);

  const submitButton = document.createElement("button");
  submitButton.id = "submitButton";
  submitButton.className = "nav-link nav-link-active submit-button";
  submitButton.textContent = "Submit";

  // Add the clear button
  const clearButton = document.createElement("button");
  clearButton.id = "clearButton";
  clearButton.textContent = "Clear";
  clearButton.className = "nav-link nav-link-active clear-button";

  buttonGroup.appendChild(submitButton);
  buttonGroup.appendChild(clearButton);
  inputGroup.appendChild(textInput);
  inputGroup.appendChild(buttonGroup);
  chatContainerWrapper.appendChild(inputGroup);

  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinner.style.display = "none";
  buttonGroup.appendChild(spinner);
}

function createChatMessage(content, sender) {
  const chatContainer = document.getElementById("chat-container");
  const chatMessage = document.createElement("div");
  chatMessage.className = "chat-message";

  // Apply styles based on the sender
  if (sender === "user") {
    chatMessage.classList.add("user-message");
  } else if (sender === "ChatGPT") {
    chatMessage.classList.add("gpt-message");
  } else {
    chatMessage.classList.add("error-message");
  }

  const chatSender = document.createElement("strong");
  chatSender.textContent =
    sender === "user"
      ? "You: "
      : sender === "ChatGPT"
      ? "ChatGPT: "
      : "Error: ";
  chatMessage.appendChild(chatSender);

  const chatContent = document.createElement("div");
  chatContent.innerHTML = content
    .replace(/<[^>]*>?/gm, "") // Remove any existing HTML tags
    .replace(
      /```([\s\S]+?)```/gm,
      '<pre><code class="language-javascript">$1</code></pre>'
    ); // Wrap code blocks with Prism-compatible tags
  chatMessage.appendChild(chatContent);

  // Apply Prism syntax highlighting
  Prism.highlightAllUnder(chatMessage);
  chatMessage.appendChild(chatContent);

  chatContainer.appendChild(chatMessage);
  const chatContainerWrapper = chatContainer.parentElement;
  chatContainerWrapper.scrollTop = chatContainerWrapper.scrollHeight;
}

function clearConversation() {
  const chatContainer = document.getElementById("chat-container");
  while (chatContainer.firstChild) {
    chatContainer.removeChild(chatContainer.firstChild);
  }
  document.getElementById("textInput").value = "";
}

async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiKey"], (result) => {
      resolve(result.apiKey || "");
    });
  });
}

async function callOpenAI(text, apiKey) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: conversationHistory,
      max_tokens: 1000,
      n: 1,
      stop: null,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return await response.json();
}

async function handleSubmit() {
  const textInput = document.getElementById("textInput");
  const userText = textInput.value;

  if (!userText) {
    return;
  }

  createChatMessage(userText, "user");
  conversationHistory.push({ role: "user", content: userText });
  textInput.value = "";

  const apiKey = await getApiKey();

  if (!apiKey) {
    createChatMessage(
      "API key not found. Please configure the API key.",
      "error"
    );
    return;
  }
  const spinner = document.querySelector(".spinner");

  try {
    spinner.style.display = "block"; // Show the spinner
    const response = await callOpenAI(userText, apiKey);
    console.log(response);
    spinner.style.display = "none"; // Hide the spinner
    let msg = response.choices.at(-1).message;
    // TODO is stop reason is not stop but length call again with user input `continue`
    createChatMessage(msg.content, "ChatGPT");
    conversationHistory.push(msg);
  } catch (error) {
    console.error(error);
    spinner.style.display = "none"; // Hide the spinner
    createChatMessage("Error: Failed to fetch response from the API.", "error");
  }
}

(async function () {
  await createChatInterface();

  document.getElementById("clearButton").addEventListener("click", async () => {
    clearConversation();
    await initConversationHistory();
  });

  document
    .getElementById("submitButton")
    .addEventListener("click", async () => {
      await handleSubmit();
    });
  addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSubmit();
    }
  });
})();
