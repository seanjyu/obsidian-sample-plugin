// import { Plugin } from 'obsidian'

// export default class ExamplePlugin extends Plugin {
    
//     statusBarTextElement: HTMLSpanElement;
    
//     onload() {
//         console.log("Hello World");

//         this.statusBarTextElement = this.addStatusBarItem().createEl('span');
//         this.statusBarTextElement.textContent = "hello";

//         this.app.workspace.on('active-leaf-change', async () => {
//             const file = this.app.workspace.getActiveFile();
//             if (file) {
//                 const content = await this.app.vault.read(file);
//                 // const content = this.app.vault.read()
//                 console.log(content);
//             }

//         })

//     }
// }

// import { Plugin } from 'obsidian';
// import {ExampleView, VIEW_TYPE_EXAMPLE} from './view';

// export default class MyPlugin extends Plugin {
//     async onload() {
//         // Register the view
//         this.registerView(
//             VIEW_TYPE_EXAMPLE,
//             (leaf) => new ExampleView(leaf)
//         );

//         // Add command to open the view
//         this.addCommand({
//             id: 'open-example-view',
//             name: 'Open Example View',
//             callback: () => this.activateView()
//         });
//     }

//     // async activateView() {
//     //     const { workspace } = this.app;
        
//     //     let leaf = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0];
        
//     //     if (!leaf) {
//     //         // Fallback: create a new leaf
//     //         leaf = workspace.getRightLeaf(true);
            
//     //         await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE });
//     //     }

        
//     //     workspace.revealLeaf(leaf);
//     // }
//         async activateView() {
//         this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
        
//         const rightLeaf = this.app.workspace.getRightLeaf(false);
//         if (rightLeaf) {
//             await rightLeaf.setViewState({
//                 type: VIEW_TYPE_EXAMPLE,
//                 active: true,
//             });
//         }
//     }
// }

// src/main.ts
import { Plugin } from 'obsidian';
import { OllamaAPI } from './services/OllamaAPI';
import { OllamaSidebarView, OLLAMA_VIEW_TYPE } from './view';

interface OllamaPluginSettings {
    ollamaUrl: string;
    defaultModel: string;
    temperature: number;
    maxTokens: number;
}

const DEFAULT_SETTINGS: OllamaPluginSettings = {
    ollamaUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    temperature: 0.7,
    maxTokens: 2048
};

export default class OllamaPlugin extends Plugin {
    settings: OllamaPluginSettings;
    ollama: OllamaAPI;

    async onload() {
        console.log('Loading Ollama Plugin');
        
        // Load settings
        await this.loadSettings();
        
        // Initialize Ollama API
        this.ollama = new OllamaAPI(this.settings.ollamaUrl);
        
        // Register the sidebar view
        this.registerView(
            OLLAMA_VIEW_TYPE,
            (leaf) => new OllamaSidebarView(leaf, this.ollama, this.settings)
        );
        
        // Add ribbon icon to open sidebar
        this.addRibbonIcon('message-circle', 'Open Ollama Chat', () => {
            this.activateView();
        });
        
        // Add command to open sidebar
        this.addCommand({
            id: 'open-ollama-chat',
            name: 'Open Ollama Chat',
            callback: () => {
                this.activateView();
            }
        });
        
        // Add command to send selected text to Ollama
        this.addCommand({
            id: 'send-selection-to-ollama',
            name: 'Send selection to Ollama',
            editorCallback: async (editor) => {
                const selection = editor.getSelection();
                if (selection) {
                    await this.sendTextToOllama(selection);
                }
            }
        });
        
        // Add command for quick AI completion
        this.addCommand({
            id: 'ai-complete-text',
            name: 'AI complete text at cursor',
            editorCallback: async (editor) => {
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                const textUpToCursor = line.substring(0, cursor.ch);
                
                if (textUpToCursor.trim()) {
                    await this.completeText(editor, textUpToCursor);
                }
            }
        });
        
        // Check Ollama connection on startup
        this.checkOllamaConnection();
    }

    async onunload() {
        console.log('Unloading Ollama Plugin');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async analyzeImage(imageFile: File, prompt: string = "You are an optical character recognition machine. Transcribe the text in the image to LaTeX accurately."): Promise<string> {
    try {
        const response = await this.ollama.generateWithImage(
            prompt, 
            imageFile, 
            'llava' // or 'llava:13b', 'bakllava', etc.
        );
        
        return response.response;
    } catch (error) {
        console.error('Image analysis failed:', error);
        throw new Error(`Image analysis failed: ${error.message}`);
    }
}

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;
        
        let leaf = workspace.getLeavesOfType(OLLAMA_VIEW_TYPE)[0];
        
        if (!leaf) {
            leaf = workspace.getRightLeaf(false)!;
            await leaf.setViewState({
                type: OLLAMA_VIEW_TYPE,
                active: true
            });
        }
        
        workspace.revealLeaf(leaf);
    }

    async checkOllamaConnection() {
        const isConnected = await this.ollama.isAvailable();
        
        if (!isConnected) {
            console.warn('Ollama is not running or not accessible at:', this.settings.ollamaUrl);
            // You could show a notice here if desired
            // new Notice('Ollama is not running. Please start Ollama to use AI features.');
        } else {
            console.log('Successfully connected to Ollama');
            
            // Optionally preload models
            try {
                const models = await this.ollama.getModels();
                console.log('Available models:', models.map(m => m.name));
            } catch (error) {
                console.error('Failed to load models:', error);
            }
        }
    }

    // Method to send text to Ollama from anywhere in the plugin
    async sendTextToOllama(text: string, prompt?: string): Promise<string> {
        try {
            const fullPrompt = prompt ? `${prompt}\n\n${text}` : text;
            
            const response = await this.ollama.generate({
                model: this.settings.defaultModel,
                prompt: fullPrompt,
                options: {
                    temperature: this.settings.temperature,
                    num_ctx: this.settings.maxTokens
                }
            });
            
            return response.response;
        } catch (error) {
            console.error('Failed to send text to Ollama:', error);
            throw new Error(`Ollama request failed: ${error.message}`);
        }
    }

    // Method for AI text completion
    async completeText(editor: any, textUpToCursor: string) {
        try {
            const completion = await this.sendTextToOllama(
                textUpToCursor, 
                "Please complete this text naturally:"
            );
            
            const cursor = editor.getCursor();
            editor.replaceRange(completion, cursor);
            
        } catch (error) {
            console.error('Text completion failed:', error);
            // Could show a notice here
        }
    }

    // Method to have a conversation (maintains history)
    // async chatWithOllama(messages: Array<{role: 'user' | 'assistant' | 'system', content: string}>) {
    //     try {
    //         const response = await this.ollama.chat({
    //             model: this.settings.defaultModel,
    //             messages: messages,
    //             options: {
    //                 temperature: this.settings.temperature,
    //                 num_ctx: this.settings.maxTokens
    //             }
    //         });
            
    //         return response.message.content;
    //     } catch (error) {
    //         console.error('Chat with Ollama failed:', error);
    //         throw error;
    //     }
    // }

        async sendToOllama(prompt: string): Promise<string> {
        try {
            const response = await this.ollama.generate({
                model: this.settings.defaultModel,
                prompt: prompt,
                options: {
                    temperature: this.settings.temperature,
                    num_ctx: this.settings.maxTokens
                }
            });
            
            return response.response;
        } catch (error) {
            console.error('Ollama request failed:', error);
            throw error;
        }
    }



    // Utility method to get streaming response
    async *getStreamingResponse(text: string, prompt?: string) {
        const fullPrompt = prompt ? `${prompt}\n\n${text}` : text;
        
        try {
            const stream = this.ollama.streamGenerate({
                model: this.settings.defaultModel,
                prompt: fullPrompt,
                options: {
                    temperature: this.settings.temperature,
                    num_ctx: this.settings.maxTokens
                }
            });
            
            for await (const chunk of stream) {
                yield chunk.response;
            }
        } catch (error) {
            console.error('Streaming failed:', error);
            throw error;
        }
    }
}