import { inject, injectable } from '@theia/core/shared/inversify';
import { codicon } from '@theia/core/lib/browser';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import { ChatViewTreeWidget } from '@theia/ai-chat-ui/lib/browser/chat-tree-view/chat-view-tree-widget';
import { AIChatInputWidget } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';

@injectable()
export class ArduinoChatViewWidget extends ChatViewWidget {
    static WELCOME_ID = 'arduino-chat-welcome';

    private welcomeDiv: HTMLDivElement | undefined;

    constructor(
        @inject(ChatViewTreeWidget) treeWidget: ChatViewTreeWidget,
        @inject(AIChatInputWidget) inputWidget: AIChatInputWidget
    ) {
        super(treeWidget, inputWidget);
    }

    protected override init(): void {
        super.init();
        this.node.classList.add('arduino-chat-view-widget');
        this.addWelcomeOverlay();
        this.setupWelcomeToggle();
    }

    private addWelcomeOverlay(): void {
        this.welcomeDiv = document.createElement('div');
        this.welcomeDiv.id = ArduinoChatViewWidget.WELCOME_ID;
        this.welcomeDiv.className = 'arduino-chat-welcome';
        this.welcomeDiv.innerHTML = this.getWelcomeHTML();
        this.node.appendChild(this.welcomeDiv);

        const newChatBtn = this.welcomeDiv.querySelector('#arduino-chat-new-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.inputWidget.activate();
            });
        }
    }

    private setupWelcomeToggle(): void {
        this.toggleWelcome();
        if (this.chatSession) {
            const model = this.chatSession.model;
            if (model) {
                this.toDispose.push(
                    model.onDidChange(() => this.toggleWelcome())
                );
            }
        }
    }

    private toggleWelcome(): void {
        if (!this.welcomeDiv) return;
        const model = this.chatSession?.model;
        const isEmpty = model ? model.isEmpty() : true;
        this.welcomeDiv.classList.toggle('hidden', !isEmpty);
    }

    private getWelcomeHTML(): string {
        return `
            <div class="arduino-chat-welcome-content">
                <div class="arduino-chat-welcome-icon">
                    <span class="${codicon('tools')}"></span>
                </div>
                <h1 class="arduino-chat-welcome-title">Arduino Assistant</h1>
                <p class="arduino-chat-welcome-subtitle">
                    Your AI-powered coding companion. I can help you write, compile, and debug Arduino sketches.
                </p>
                <div class="arduino-chat-welcome-suggestions">
                    <div class="arduino-chat-welcome-suggestion" data-prompt="Create a blinking LED sketch for Arduino Uno">
                        <span class="${codicon('debug-start')}"></span>
                        <span>Blink an LED</span>
                    </div>
                    <div class="arduino-chat-welcome-suggestion" data-prompt="Search for the WiFi library and install it">
                        <span class="${codicon('library')}"></span>
                        <span>Install a library</span>
                    </div>
                    <div class="arduino-chat-welcome-suggestion" data-prompt="List all connected boards">
                        <span class="${codicon('circuit-board')}"></span>
                        <span>List boards</span>
                    </div>
                    <div class="arduino-chat-welcome-suggestion" data-prompt="Write a sketch that reads temperature from a sensor">
                        <span class="${codicon('edit')}"></span>
                        <span>Write code</span>
                    </div>
                </div>
                <button id="arduino-chat-new-btn" class="arduino-chat-welcome-btn">
                    <span class="${codicon('comment-discussion')}"></span>
                    Start a conversation
                </button>
            </div>
        `;
    }
}
