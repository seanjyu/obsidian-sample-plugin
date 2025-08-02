// src/services/OllamaAPI.ts
export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
}

export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface OllamaChatRequest {
    model: string;
    messages: OllamaMessage[];
    stream?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_ctx?: number;
    };
}

export interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: OllamaMessage;
    done: boolean;
}

export interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    images?: boolean;
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        num_ctx?: number;
    };
}



export interface OllamaGenerateResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export class OllamaAPI {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if Ollama is running and accessible
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            console.error('Ollama connection failed:', error);
            return false;
        }
    }

    /**
     * Get list of available models
     */
    async getModels(): Promise<OllamaModel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Failed to fetch models:', error);
            throw error;
        }
    }

    /**
     * Chat with a model (conversation-style)
     */
    async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...request,
                    stream: false // Non-streaming by default
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Chat request failed:', error);
            throw error;
        }
    }

    /**
     * Generate text with a model (single prompt)
     */
    async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...request,
                    stream: false // Non-streaming by default
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Generate request failed:', error);
            throw error;
        }
    }

    /**
     * Stream chat responses (for real-time responses)
     */
    async *streamChat(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse, void, unknown> {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...request,
                    stream: true
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data: OllamaChatResponse = JSON.parse(line);
                            yield data;
                            if (data.done) return;
                        } catch (e) {
                            console.warn('Failed to parse streaming response line:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream chat failed:', error);
            throw error;
        }
    }

    /**
     * Stream generate responses (for real-time responses)
     */
    async *streamGenerate(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse, void, unknown> {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...request,
                    stream: true
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data: OllamaGenerateResponse = JSON.parse(line);
                            yield data;
                            if (data.done) return;
                        } catch (e) {
                            console.warn('Failed to parse streaming response line:', line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream generate failed:', error);
            throw error;
        }
    }

    /**
     * Pull a model from Ollama registry
     */
    async pullModel(modelName: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: modelName
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // This is a streaming response, you might want to handle progress
            const reader = response.body?.getReader();
            if (!reader) return;

            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const text = decoder.decode(value);
                console.log('Pull progress:', text);
            }
        } catch (error) {
            console.error('Failed to pull model:', error);
            throw error;
        }
    }

    /**
     * Delete a model
     */
    async deleteModel(modelName: string): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: modelName
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to delete model:', error);
            throw error;
        }
    }

    async imageToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    // Remove the data URL prefix to get just the base64 string
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                } else {
                    reject(new Error('Failed to read file'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async generateWithImage(prompt: string, imageFile: File, model: string = 'llava'): Promise<OllamaGenerateResponse> {
        try {
            const base64Image = await this.imageToBase64(imageFile);
            
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    images: [base64Image],
                    stream: false
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Generate with image failed:', error);
            throw error;
        }
    }
}