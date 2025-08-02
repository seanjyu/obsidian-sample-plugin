<script>
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher();
    
    let dragOver = false;
    let pastedImage = null;
    let pasteArea;
    
    function handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.type.startsWith('image/')) {
                event.preventDefault();
                
                const file = item.getAsFile();
                if (file) {
                    handleImageFile(file);
                }
                break;
            }
        }
    }
    
    function handleDrop(event) {
        event.preventDefault();
        dragOver = false;
        
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                handleImageFile(file);
            }
        }
    }
    
    function handleImageFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const result = e.target?.result;
            pastedImage = result;
            
            // Dispatch the image data to parent component
            dispatch('imageAdded', {
                file: file,
                dataUrl: result,
                name: file.name || 'pasted-image.png'
            });
        };
        
        reader.readAsDataURL(file);
    }
    
    function clearImage() {
        pastedImage = null;
        dispatch('imageCleared');
    }
    
    function handleDragOver(event) {
        event.preventDefault();
        dragOver = true;
    }
    
    function handleDragLeave() {
        dragOver = false;
    }
</script>

<div 
    class="paste-area" 
    class:drag-over={dragOver}
    bind:this={pasteArea}
    on:paste={handlePaste}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    tabindex="0"
>
    {#if pastedImage}
        <div class="image-preview">
            <img src={pastedImage} alt="Pasted" />
            <button class="clear-btn" on:click={clearImage}>×</button>
        </div>
    {:else}
        <div class="placeholder">
            <p>📋 Click here and paste an image (Ctrl+V)</p>
            <p>or drag and drop an image file</p>
        </div>
    {/if}
</div>

<style>
    .paste-area {
        border: 2px dashed #ccc;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        outline: none;
    }
    
    .paste-area:hover,
    .paste-area:focus {
        border-color: #007acc;
        background-color: #f8f9fa;
    }
    
    .paste-area.drag-over {
        border-color: #007acc;
        background-color: #e3f2fd;
    }
    
    .placeholder {
        color: #666;
    }
    
    .placeholder p {
        margin: 5px 0;
        font-size: 0.9em;
    }
    
    .image-preview {
        position: relative;
        max-width: 100%;
    }
    
    .image-preview img {
        max-width: 100%;
        max-height: 150px;
        object-fit: contain;
        border-radius: 4px;
    }
    
    .clear-btn {
        position: absolute;
        top: -10px;
        right: -10px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
    }
    
    .clear-btn:hover {
        background: #cc0000;
    }
</style>