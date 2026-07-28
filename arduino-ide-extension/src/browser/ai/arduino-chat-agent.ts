import { injectable, inject } from '@theia/core/shared/inversify';
import {
  AbstractStreamParsingChatAgent,
  ChatAgentLocation,
  SystemMessageDescription,
} from '@theia/ai-chat/lib/common/chat-agents';
import {
  ToolRequest,
  PromptTemplate,
  AgentSpecificVariables,
  ToolInvocationRegistry,
} from '@theia/ai-core/lib/common';

export const ArduinoAgentId = 'arduino-assistant';

const ARDUINO_SYSTEM_PROMPT = `You are an expert Arduino assistant embedded in the Arduino IDE. You help users with:
- Writing, modifying, and debugging Arduino sketches (C++ code for microcontrollers)
- Selecting the right board and port
- Installing and managing Arduino libraries (search, install, uninstall)
- Managing board platforms (install ESP32, RP2040, STM32, etc.)
- Compiling and uploading sketches
- Reading serial monitor output and sending serial commands
- Exploring project files and editing code directly
- Understanding error messages and fixing code issues
- Best practices for embedded development (memory management, power efficiency, etc.)

You have access to tools that control the IDE. Use them proactively when the user asks you to perform actions.

Available tools:
- list_boards: Show all available boards and detected USB devices
- select_board: Select a board and port for the current sketch
- search_library: Search the Arduino library index
- install_library: Install a library by name
- uninstall_library: Remove an installed library
- install_board_platform: Install new board platforms (ESP32, etc.)
- create_sketch: Create a new Arduino sketch
- read_sketch: Read the current open file content
- compile_sketch: Compile/verify the sketch
- upload_sketch: Upload the sketch to a board
- serial_monitor: Read serial output or send commands to a connected board
- explore_files: Browse workspace files and directories
- edit_code: Edit code in the currently open file (append, replace, replace_all)

When writing code:
- Always include necessary #include statements
- Use proper Arduino API conventions (setup(), loop(), pinMode(), digitalWrite(), etc.)
- Comment complex sections
- Consider the target board's limitations (memory, pins, clock speed)

When the user asks to compile or upload, use the appropriate tools. Always confirm the board and port selection before uploading.`;

const ARDUINO_TOOLS: string[] = [
  'arduino-board-list',
  'arduino-board-select',
  'arduino-lib-search',
  'arduino-lib-install',
  'arduino-lib-uninstall',
  'arduino-board-install',
  'arduino-sketch-create',
  'arduino-sketch-read',
  'arduino-compile',
  'arduino-upload',
  'arduino-serial-monitor',
  'arduino-file-explorer',
  'arduino-code-edit',
];

@injectable()
export class ArduinoChatAgent extends AbstractStreamParsingChatAgent {
  readonly name = 'Arduino Assistant';
  readonly description = 'Expert Arduino assistant for writing, compiling, uploading sketches, managing libraries and boards, and debugging embedded projects.';
  readonly variables: string[] = [];
  readonly promptTemplates: PromptTemplate[] = [];
  readonly agentSpecificVariables: AgentSpecificVariables[] = [];
  readonly functions: string[] = ARDUINO_TOOLS;
  override readonly locations: ChatAgentLocation[] = [ChatAgentLocation.Panel];
  override readonly iconClass = 'codicon codicon-tools';
  override readonly tags = ['Chat', 'Arduino', 'Embedded', 'IoT'];

  @inject(ToolInvocationRegistry)
  protected readonly toolInvocationRegistry: ToolInvocationRegistry;

  constructor() {
    super(
      ArduinoAgentId,
      [{ purpose: 'chat', identifier: 'kilo-auto/free' }],
      'chat'
    );
  }

  protected override async getSystemMessageDescription(): Promise<SystemMessageDescription | undefined> {
    const functionDescriptions = new Map<string, ToolRequest>();
    for (const toolId of this.functions) {
      const tool = this.toolInvocationRegistry.getFunction(toolId);
      if (tool) {
        functionDescriptions.set(toolId, tool);
      }
    }
    return {
      text: ARDUINO_SYSTEM_PROMPT,
      functionDescriptions,
    };
  }

  protected override getTools(request: import('@theia/ai-chat/lib/common/chat-model').ChatRequestModel): ToolRequest[] | undefined {
    return this.functions
      .map((id) => this.toolInvocationRegistry.getFunction(id))
      .filter((t): t is ToolRequest => t !== undefined);
  }
}
