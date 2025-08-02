// import { ItemView, WorkspaceLeaf } from 'obsidian';
// import SidebarComponent from './components/SidebarComponent.svelte';

// export const VIEW_TYPE_EXAMPLE = 'example-view';

// export class ExampleView extends ItemView {
//   private svelteComponent: SidebarComponent;

//   constructor(leaf: WorkspaceLeaf) {
//     super(leaf);
//   }

//   getViewType() {
//     return VIEW_TYPE_EXAMPLE;
//   }

//   getDisplayText() {
//     return 'Example view';
//   }

//   async onOpen() {
//     const container = this.containerEl.children[1];
//     container.empty();
//     container.createEl('h4', { text: 'test' });

//     this.svelteComponent = new SidebarComponent({
//       target: container,
//       props: {
//         // your props here
//       }
//     });


//   }

//   async onClose() {
//     if (this.svelteComponent) {
//       this.svelteComponent.$destroy();
//     }
//   }
// }

// src/view.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import SidebarComponent from './components/SidebarComponent.svelte';
import { OllamaAPI } from './services/OllamaAPI';

export const OLLAMA_VIEW_TYPE = 'ollama-sidebar-view';

export class OllamaSidebarView extends ItemView {
    private svelteComponent: SidebarComponent;
    private ollama: OllamaAPI;
    private settings: any;

    constructor(leaf: WorkspaceLeaf, ollama: OllamaAPI, settings: any) {
        super(leaf);
        this.ollama = ollama;
        this.settings = settings;
    }

    getViewType() {
        return OLLAMA_VIEW_TYPE;
    }

    getDisplayText() {
        return 'Latex OCR tool';
    }

    getIcon() {
        return 'message-circle';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        
        // Mount the Svelte component with the Ollama API instance
        this.svelteComponent = new SidebarComponent({
            target: container,
            props: {
                ollama: this.ollama,
                settings: this.settings,
                app: this.app // Pass the Obsidian app if needed
            }
        });
    }

    async onClose() {
        // Clean up the Svelte component
        if (this.svelteComponent) {
            this.svelteComponent.$destroy();
        }
    }
}