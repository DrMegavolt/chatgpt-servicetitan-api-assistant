const defaultInstructions = `The following is a conversation with a ServiceTitan API AI assistant. 
    Instructions to the assistant: 
    Prefer giving code examples instead of long explanations. 
    In code examples avoid using unofficial community package that wrap API calls, use direct call to the API 
    There is no official ServiceTitan SDK for any programming language
    You can reference APIs from different systems if asked about integration 
    Include sample values for fields in body 
    By default use JavaScript as language for code examples `;

document.getElementById("saveButton").addEventListener("click", () => {
  const apiKey = document.getElementById("apiKey").value;
  const instructions = document.getElementById("instructions").value;

  chrome.storage.sync.set({ apiKey,  instructions}, () => {
    const status = document.getElementById("status");
    status.textContent = "Options saved.";
    setTimeout(() => {
      status.textContent = "";
    }, 1500);
  });

});
// Restores options from chrome.storage
function restore_options() {
  chrome.storage.sync.get(['apiKey', 'instructions'], (items) => {
    document.getElementById('apiKey').value = items.apiKey || '';
    document.getElementById('instructions').value = items.instructions || defaultInstructions;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  restore_options()
});
