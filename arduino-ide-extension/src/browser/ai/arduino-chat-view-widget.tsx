import { inject, injectable } from '@theia/core/shared/inversify';
import { BaseWidget, codicon, PanelLayout } from '@theia/core/lib/browser';
import { ChatViewWidget } from '@theia/ai-chat-ui/lib/browser/chat-view-widget';
import { ChatViewTreeWidget } from '@theia/ai-chat-ui/lib/browser/chat-tree-view/chat-view-tree-widget';
import { AIChatInputWidget } from '@theia/ai-chat-ui/lib/browser/chat-input-widget';

@injectable()
export class ArduinoChatViewWidget extends ChatViewWidget {
    private headerWidget: BaseWidget | undefined;

    constructor(
        @inject(ChatViewTreeWidget) treeWidget: ChatViewTreeWidget,
        @inject(AIChatInputWidget) inputWidget: AIChatInputWidget
    ) {
        super(treeWidget, inputWidget);
    }

    protected override init(): void {
        super.init();
        this.title.label = 'Arduino Assistant';
        this.title.caption = 'Arduino Assistant';
        this.title.iconClass = codicon('tools');
        this.node.classList.add('arduino-chat-view-widget');
        this.node.style.minWidth = '380px';

        this.createHeaderWidget();
        this.setupHeaderToggle();
    }

    private createHeaderWidget(): void {
        this.headerWidget = new BaseWidget();
        this.headerWidget.id = 'arduino-chat-header-widget';
        this.headerWidget.node.className = 'arduino-chat-header';
        this.headerWidget.node.innerHTML = `
            <div class="arduino-chat-header-top">
                <div class="arduino-chat-header-icon-box">
                    <span class="${codicon('tools')}"></span>
                </div>
                <div class="arduino-chat-header-titles">
                    <div class="arduino-chat-header-title-row">
                        <h2 class="arduino-chat-header-title">Arduino AI Assistant</h2>
                        <span class="arduino-chat-badge">Kilo AI</span>
                    </div>
                    <p class="arduino-chat-header-subtitle">Write, compile, debug, and upload sketches with natural language</p>
                </div>
            </div>
            <div class="arduino-chat-header-examples">
                <button class="arduino-chat-example-pill" data-prompt="Create a sketch to blink the built-in LED on pin 13 with a 1 second delay">
                    <span class="${codicon('debug-start')}"></span>
                    <span>Blink LED</span>
                </button>
                <button class="arduino-chat-example-pill" data-prompt="Write an ESP32 WiFi scanner sketch that lists all nearby networks">
                    <span class="${codicon('radio-tower')}"></span>
                    <span>WiFi Scanner</span>
                </button>
                <button class="arduino-chat-example-pill" data-prompt="Write an Arduino sketch to read temperature from a DHT11 sensor">
                    <span class="${codicon('dashboard')}"></span>
                    <span>Temp Sensor</span>
                </button>
                <button class="arduino-chat-example-pill" data-prompt="Search for Adafruit GFX library and install it">
                    <span class="${codicon('library')}"></span>
                    <span>Install Library</span>
                </button>
            </div>
        `;

        const pills = this.headerWidget.node.querySelectorAll('.arduino-chat-example-pill');
        pills.forEach((pill) => {
            pill.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const prompt = target?.getAttribute('data-prompt');
                if (prompt) {
                    this.onQuery(prompt);
                }
            });
        });

        if (this.layout instanceof PanelLayout) {
            this.layout.insertWidget(0, this.headerWidget);
        } else {
            this.node.prepend(this.headerWidget.node);
        }
    }

    private setupHeaderToggle(): void {
        this.toggleHeader();
        if (this.chatSession) {
            const model = this.chatSession.model;
            if (model) {
                this.toDispose.push(
                    model.onDidChange(() => this.toggleHeader())
                );
            }
        }
    }

    private toggleHeader(): void {
        if (!this.headerWidget) return;
        const model = this.chatSession?.model;
        const isEmpty = model ? model.isEmpty() : true;
        this.headerWidget.node.classList.toggle('hidden', !isEmpty);
    }
}
