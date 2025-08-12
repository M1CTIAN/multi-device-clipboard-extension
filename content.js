document.addEventListener('copy', () => {
    const selectedText = document.getSelection().toString();
    if (selectedText) {
        chrome.runtime.sendMessage({ type: 'textCopied', text: selectedText });
    }
});
