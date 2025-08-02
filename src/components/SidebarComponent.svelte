
<!-- <script>
    let inputValue = '';
    let items = [];
    
    function handleSubmit() {
        items = [...items, inputValue];
        inputValue = '';
    }
</script>

<div class="sidebar-content">
    <input bind:value={inputValue} placeholder="Enter something..." />
    <button on:click={handleSubmit}>Add</button>
    
    {#each items as item}
        <div class="item">{item}</div>
    {/each}
</div>

<style>
    .sidebar-content {
        padding: 10px;
    }
</style> -->

<!-- SidebarComponent.svelte -->
<script>
    
    import ImageInputComponent from './ImageInputComponent.svelte';
    
    import ImagePasteComponent from './ImagePasteComponent.svelte';
    
    let currentImage = null; 

    // Receive Ollama API instance from the main plugin
    export let ollama;
    export let settings;
    
    let inputValue = '';
    let messages = [];
    let models = [];
    let selectedModel = '';
    let isLoading = false;
    let isConnected = false;
    let streamingResponse = '';
    let conversation = []; // Store full conversation history
    
    // Check connection on component mount
    async function checkConnection() {
        isConnected = await ollama.isAvailable();
        if (isConnected) {
            await loadModels();
        }
    }

        // Handle image selection
    function handleImageSelected(event) {
        currentImage = event.detail;
        console.log('Image selected:', currentImage.name);
    }
    
    // Handle image clearing
    function handleImageCleared() {
        currentImage = null;
        console.log('Image cleared');
    }
    
    // Convert file to base64
    async function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix to get just the base64 string
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // Load available models
    async function loadModels() {
        try {
            models = await ollama.getModels();
            if (models.length > 0 && !selectedModel) {
                selectedModel = models[0].name;
            }
        } catch (error) {
            console.error('Failed to load models:', error);
        }
    }
    
    // Send message (with or without image)
    async function sendMessage() {
        if ((!inputValue.trim() && !currentImage) || !selectedModel || isLoading) return;
        
        const messageText = inputValue.trim() || "You are an optical character recognition machine. Transcribe the text in the image to LaTeX accurately.";
        const hasImage = currentImage !== null;
        
        // Add user message to chat
        messages = [...messages, { 
            type: 'user', 
            content: messageText,
            hasImage: hasImage,
            imageName: hasImage ? currentImage.name : null
        }];
        
        const currentInput = inputValue;
        const imageToProcess = currentImage;
        
        // Clear inputs
        inputValue = '';
        currentImage = null;
        isLoading = true;
        
        try {
            let response;
            
            if (imageToProcess) {
                
                console.log("image to process triggered");
                // Send with image using generate API
                // const base64Image = await fileToBase64(imageToProcess);
                const base64Image = imageToProcess.dataUrl.split(',')[1];
                console.log("base 64 finished");
                response = await ollama.generate({
                    model: selectedModel,
                    prompt: messageText,
                    images: [base64Image],
                    options: {
                        temperature: 0.7
                    }
                });
                
                messages = [...messages, { 
                    type: 'assistant', 
                    content: response.response 
                }];
                
            } else {
                // Text-only message using generate API
                response = await ollama.generate({
                    model: selectedModel,
                    prompt: messageText,
                    options: {
                        temperature: 0.7
                    }
                });
                
                messages = [...messages, { 
                    type: 'assistant', 
                    content: response.response 
                }];
            }
            
        } catch (error) {
            console.error('Message failed:', error);
            messages = [...messages, { 
                type: 'error', 
                content: `Error: ${error.message}` 
            }];
        }
        
        isLoading = false;
    }
    
    // Send message with streaming (real-time response)
    async function sendStreamingMessage() {
        if (!inputValue.trim() || !selectedModel || isLoading) return;
        
        const userMessage = { role: 'user', content: inputValue.trim() };
        conversation = [...conversation, userMessage];
        messages = [...messages, { type: 'user', content: inputValue.trim() }];
        
        inputValue = '';
        isLoading = true;
        streamingResponse = '';
        
        // Add placeholder for streaming response
        messages = [...messages, { type: 'streaming', content: '' }];
        
        try {
            const stream = ollama.streamChat({
                model: selectedModel,
                messages: conversation,
                options: {
                    temperature: 0.7
                }
            });
            
            let fullResponse = '';
            
            for await (const chunk of stream) {
                if (chunk.message?.content) {
                    fullResponse += chunk.message.content;
                    streamingResponse = fullResponse;
                    
                    // Update the last message (streaming placeholder)
                    messages[messages.length - 1] = { 
                        type: 'streaming', 
                        content: fullResponse 
                    };
                    messages = [...messages]; // Trigger reactivity
                }
                
                if (chunk.done) {
                    // Convert streaming message to final assistant message
                    messages[messages.length - 1] = { 
                        type: 'assistant', 
                        content: fullResponse 
                    };
                    conversation = [...conversation, { role: 'assistant', content: fullResponse }];
                    break;
                }
            }
            
        } catch (error) {
            console.error('Streaming chat failed:', error);
            messages[messages.length - 1] = { 
                type: 'error', 
                content: `Error: ${error.message}` 
            };
        }
        
        isLoading = false;
        streamingResponse = '';
    }
    
    // Simple generate (single prompt, no conversation history)
    async function generateResponse() {
        if (!inputValue.trim() || !selectedModel || isLoading) return;
        
        const prompt = inputValue.trim();
        messages = [...messages, { type: 'user', content: prompt }];
        inputValue = '';
        isLoading = true;
        
        try {
            const response = await ollama.generate({
                model: selectedModel,
                prompt: prompt,
                options: {
                    temperature: 0.7,
                    num_ctx: 2048
                }
            });
            
            messages = [...messages, { type: 'assistant', content: response.response }];
            
        } catch (error) {
            console.error('Generate failed:', error);
            messages = [...messages, { type: 'error', content: `Error: ${error.message}` }];
        }
        
        isLoading = false;
    }
    
    // Clear conversation
    function clearConversation() {
        messages = [];
        conversation = [];
        streamingResponse = '';
    }
    
    // Initialize on mount
    checkConnection();
    
    // Handle Enter key
    function handleKeydown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendStreamingMessage();
        }
    }

    function handleImageAdded(event) {
        currentImage = event.detail;
        console.log('Image added:', currentImage);
    }
    
    
</script>

<div class="sidebar-content">
    <div class="header">
        <h3>Ollama Chat</h3>
        <div class="status">
            Status: <span class="status-indicator {isConnected ? 'connected' : 'disconnected'}">
                {isConnected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    </div>
    
    {#if isConnected}
        <div class="model-selector">
            <label for="model-select">Model:</label>
            <select id="model-select" bind:value={selectedModel}>
                {#each models as model}
                    <option value={model.name}>
                        {model.name}
                        {#if model.name.includes('llava') || model.name.includes('vision')}
                            📷
                        {/if}
                    </option>
                {/each}
            </select>
        </div>
        
        <div class="messages-container">
            {#each messages as message}
                <div class="message {message.type}">
                    <div class="message-header">
                        {message.type === 'user' ? 'You' : message.type === 'error' ? 'Error' : 'Ollama'}
                        {#if message.hasImage}
                            <span class="image-indicator">📷 {message.imageName}</span>
                        {/if}
                    </div>
                    <div class="message-content">{message.content}</div>
                </div>
            {/each}
            
            {#if isLoading}
                <div class="message loading">
                    <div class="message-header">Ollama</div>
                    <div class="message-content">Processing{currentImage ? ' image' : ''}...</div>
                </div>
            {/if}
        </div>
        
        <div class="input-container">
            <!-- Image Input Component -->
            <!-- <ImageInputComponent 
                on:imageSelected={handleImageSelected}
                on:imageCleared={handleImageCleared}
            /> -->
            <ImagePasteComponent 
                on:imageAdded={handleImageAdded}
                on:imageCleared={handleImageCleared}
            />
            
            <!-- Text Input -->
            <textarea 
                bind:value={inputValue} 
                placeholder={currentImage ? "Ask about this image..." : "Type your message..."} 
                on:keydown={handleKeydown}
                disabled={isLoading}
                rows="2"
            ></textarea>
            
            <div class="button-group">
                <button on:click={sendMessage} disabled={isLoading || (!inputValue.trim() && !currentImage)}>
                    {isLoading ? 'Sending...' : currentImage ? 'Analyze Image' : 'Send'}
                </button>
                <button on:click={clearConversation} disabled={isLoading}>
                    Clear
                </button>
            </div>
        </div>
    {:else}
        <div class="error-state">
            <p>Cannot connect to Ollama. Make sure it's running on localhost:11434</p>
            <button on:click={checkConnection}>Retry Connection</button>
        </div>
    {/if}
</div>


<style>
    .sidebar-content {
        padding: 15px;
        height: 100%;
        display: flex;
        flex-direction: column;
        font-family: var(--font-interface);
    }
    
    .header {
        margin-bottom: 15px;
    }
    
    .header h3 {
        margin: 0 0 5px 0;
        color: var(--text-normal);
    }
    
    .status-indicator {
        font-weight: bold;
    }
    
    .status-indicator.connected {
        color: var(--text-success);
    }
    
    .status-indicator.disconnected {
        color: var(--text-error);
    }
    
    .model-selector {
        margin-bottom: 15px;
    }
    
    .model-selector label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: var(--text-normal);
    }
    
    .model-selector select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
    }
    
    .messages-container {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 15px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        padding: 10px;
        background: var(--background-secondary);
    }
    
    .message {
        margin-bottom: 15px;
        padding: 10px;
        border-radius: 6px;
    }
    
    .message.user {
        background: var(--background-primary-alt);
        border-left: 3px solid var(--interactive-accent);
    }
    
    .message.assistant {
        background: var(--background-primary);
        border-left: 3px solid var(--text-accent);
    }
    
    .message.streaming {
        background: var(--background-primary);
        border-left: 3px solid var(--text-accent);
    }
    
    .message.error {
        background: var(--background-primary);
        border-left: 3px solid var(--text-error);
    }
    
    .message.loading {
        background: var(--background-primary);
        opacity: 0.7;
    }
    
    .message-header {
        font-weight: bold;
        font-size: 0.9em;
        margin-bottom: 5px;
        color: var(--text-muted);
    }
    
    .message-content {
        line-height: 1.4;
        white-space: pre-wrap;
        color: var(--text-normal);
    }
    
    .cursor {
        animation: blink 1s infinite;
    }
    
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
    
    .input-container {
        border-top: 1px solid var(--background-modifier-border);
        padding-top: 15px;
    }
    
    .input-container textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
        min-height: 60px;
        font-family: var(--font-interface);
    }
    
    .input-container textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
    }
    
    .button-group {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
    }
    
    .button-group button {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        background: var(--interactive-normal);
        color: var(--text-on-accent);
        cursor: pointer;
        font-size: 0.9em;
        flex: 1;
        min-width: fit-content;
    }
    
    .button-group button:hover:not(:disabled) {
        background: var(--interactive-hover);
    }
    
    .button-group button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .error-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
    }
    
    .error-state button {
        margin-top: 15px;
        padding: 10px 20px;
        background: var(--interactive-normal);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .error-state button:hover {
        background: var(--interactive-hover);
    }
</style>