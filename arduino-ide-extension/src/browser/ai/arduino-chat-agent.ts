import { injectable, inject } from '@theia/core/shared/inversify';
import {
  AbstractStreamParsingChatAgent,
  ChatAgentLocation,
  SystemMessageDescription,
} from '@theia/ai-chat/lib/common/chat-agents';
import { BoardsService, emptyBoardsConfig } from '../../common/protocol/boards-service';
import { BoardsServiceProvider } from '../boards/boards-service-provider';
import { SketchesService } from '../../common/protocol/sketches-service';
import { EditorManager } from '../theia/editor/editor-manager';
import { ToolInvocationRegistry, ToolRequest } from '@theia/ai-core/lib/common';
import { KiloLanguageModel } from './kilo-language-model-provider';

export const ArduinoAgentId = 'arduino-assistant';

const TOOL_IDS = [
  'arduino-board-list',
  'arduino-board-select',
  'arduino-lib-search',
  'arduino-lib-install',
  'arduino-lib-uninstall',
  'arduino-sketch-create',
  'arduino-sketch-read',
  'arduino-compile',
  'arduino-upload',
  'arduino-serial-monitor',
  'arduino-board-install',
  'arduino-file-explorer',
  'arduino-code-edit',
];

const ARDUINO_SYSTEM_PROMPT = `You are the Arduino Assistant — an expert AI embedded in the Arduino IDE. You help users write, compile, debug, and upload Arduino sketches. You have direct access to IDE tools and should use them proactively whenever a task can be completed faster with a tool.

## Core capabilities
- **Boards**: list connected boards, select active board, install board platforms
- **Libraries**: search, install, uninstall libraries from the Library Manager
- **Sketches**: create, read, edit .ino files in the workspace
- **Build**: compile sketches and upload them to the selected board
- **Debug**: check serial monitor, browse files in the project
- **Code**: edit existing sketch files with precise changes

## Tool usage rules
- Use tools automatically when the user asks for an action you can perform.
- After executing a tool, summarize the result and offer next steps.
- If the user's request is ambiguous, pick the most likely tool and confirm.
- Available tools:
\${TOOL_DESCRIPTIONS}

## Code writing guidelines
- Include all necessary #include statements.
- Follow Arduino API conventions: setup(), loop(), pinMode(), digitalWrite(), analogRead().
- Be mindful of the target board's constraints (flash, RAM, clock speed, pinout).
- Use proper formatting and add comments for non-obvious logic.
- When editing existing code, preserve the user's style and structure.

## Response style
- Be concise but thorough — explain what you did and why.
- When showing code, format it properly with \`\`\`cpp blocks.
- If something goes wrong (compile error, tool failure), explain the error and suggest a fix.
- Offer follow-up actions: "Would you like me to upload this to your board?"

Below is the current IDE state. Use it to tailor your responses.`;

const ARDUINO_TOOLS: string[] = TOOL_IDS;

@injectable()
export class ArduinoChatAgent extends AbstractStreamParsingChatAgent {
  readonly name = 'Arduino Assistant';
  readonly description = 'Expert Arduino assistant for writing, compiling, uploading sketches, managing libraries and boards, and debugging embedded projects.';
  readonly variables: string[] = [];
  readonly promptTemplates = [];
  readonly agentSpecificVariables = [];
  readonly functions: string[] = ARDUINO_TOOLS;
  override readonly locations: ChatAgentLocation[] = [ChatAgentLocation.Panel];
  override readonly iconClass = 'codicon codicon-tools';
  override readonly tags = ['Chat', 'Arduino', 'Embedded', 'IoT'];

  @inject(BoardsService)
  protected readonly boardsService: BoardsService;
  @inject(BoardsServiceProvider)
  protected readonly boardsServiceProvider: BoardsServiceProvider;
  @inject(SketchesService)
  protected readonly sketchesService: SketchesService;
  @inject(EditorManager)
  protected readonly editorManager: EditorManager;

  constructor() {
    super(
      ArduinoAgentId,
      [{ purpose: 'chat', identifier: 'kilo-auto/free' }],
      'chat'
    );
  }

  protected override async getLanguageModel(languageModelPurpose: string): Promise<import('@theia/ai-core/lib/common').LanguageModel> {
    try {
      const model = await super.getLanguageModel(languageModelPurpose);
      if (model) {
        return model;
      }
    } catch {
      // fallback if registry resolution is pending
    }
    return new KiloLanguageModel();
  }

  private async getCurrentState(): Promise<string> {
    const parts: string[] = [];
    const config = this.boardsServiceProvider.boardsConfig || emptyBoardsConfig;
    if (config.selectedBoard?.fqbn) {
      parts.push(`Selected board: ${config.selectedBoard.name} (FQBN: ${config.selectedBoard.fqbn})`);
    } else {
      parts.push('Selected board: none');
    }
    if (config.selectedPort?.address) {
      parts.push(`Selected port: ${config.selectedPort.address} (${config.selectedPort.protocol || 'serial'})`);
    } else {
      parts.push('Selected port: none');
    }
    try {
      const detectedPorts = await this.boardsService.getDetectedPorts();
      const entries = Object.entries(detectedPorts);
      if (entries.length > 0) {
        parts.push('Detected devices:');
        for (const [, detected] of entries) {
          const boardNames = detected.boards?.map(b => b.name).join(', ') || 'unknown';
          parts.push(`  - Port ${detected.port}: ${boardNames}`);
        }
      } else {
        parts.push('Detected devices: none');
      }
    } catch {
      parts.push('Detected devices: (unavailable)');
    }
    const editorWidget = this.editorManager.currentEditor;
    if (editorWidget) {
      const uri = editorWidget.getResourceUri();
      if (uri) {
        try {
          const sketch = await this.sketchesService.maybeLoadSketch(uri.toString());
          if (sketch) {
            parts.push(`Current sketch: ${sketch.name} (${uri.path.toString()})`);
          } else {
            parts.push(`Current file: ${uri.path.toString()}`);
          }
        } catch {
          parts.push(`Current file: ${uri.path.toString()}`);
        }
      }
    }
    try {
      const installedBoards = await this.boardsService.getInstalledBoards();
      if (installedBoards.length > 0) {
        const unique = [...new Set(installedBoards.map(b => b.name))];
        parts.push(`Available boards (${unique.length}): ${unique.join(', ')}`);
      }
    } catch {
      // skip
    }
    try {
      const platforms = await this.boardsService.getInstalledPlatforms();
      if (platforms.length > 0) {
        parts.push(`Installed platforms: ${platforms.map(p => `${p.name || p.id} v${p.installedVersion || '?'}`).join(', ')}`);
      }
    } catch {
      // skip
    }
    return parts.length > 0 ? `\n\nCurrent IDE State:\n${parts.join('\n')}` : '';
  }

  @inject(ToolInvocationRegistry)
  protected readonly toolRegistry: ToolInvocationRegistry;

  protected override async getSystemMessageDescription(): Promise<SystemMessageDescription | undefined> {
    const state = await this.getCurrentState();
    const functionDescriptions = new Map<string, ToolRequest>();
    for (const toolId of TOOL_IDS) {
      const tool = this.toolRegistry.getFunction(toolId);
      if (tool) {
        functionDescriptions.set(toolId, tool);
      }
    }
    const toolDescriptions = Array.from(functionDescriptions.values())
      .map(t => `- **${t.id}**: ${t.description} — parameters: \`${JSON.stringify(t.parameters || {})}\``)
      .join('\n');
    const prompt = ARDUINO_SYSTEM_PROMPT.replace('${TOOL_DESCRIPTIONS}', toolDescriptions);
    return {
      text: prompt + state,
      functionDescriptions,
    };
  }
}
