import { injectable, inject } from '@theia/core/shared/inversify';
import { ToolProvider, ToolRequest } from '@theia/ai-core/lib/common';
import {
  BoardsService,
  emptyBoardsConfig,
} from '../../common/protocol/boards-service';
import { LibraryService, LibraryPackage } from '../../common/protocol/library-service';
import { SketchesService } from '../../common/protocol/sketches-service';
import { CoreService } from '../../common/protocol/core-service';
import { BoardsServiceProvider } from '../boards/boards-service-provider';
import { EditorManager } from '../theia/editor/editor-manager';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service';

// ---- Board List ----

@injectable()
export class BoardListToolProvider implements ToolProvider {
  @inject(BoardsService) protected boardsService: BoardsService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-board-list',
      name: 'list_boards',
      description:
        'Lists all available boards, both installed and detectable via USB. Returns board names, FQBNs, and detected ports.',
      providerName: 'arduino-tools',
      handler: async () => {
        const boards = await this.boardsService.getInstalledBoards();
        const detectedPorts = await this.boardsService.getDetectedPorts();
        const result: Record<string, unknown>[] = boards.map((b) => ({
          name: b.name,
          fqbn: b.fqbn,
          platform: b.packageName,
        }));
        for (const [, detected] of Object.entries(detectedPorts)) {
          result.push({
            port: detected.port,
            detectedBoards: detected.boards?.map((b) => ({
              name: b.name,
              fqbn: b.fqbn,
            })),
          });
        }
        return JSON.stringify(result, null, 2);
      },
    };
  }
}

// ---- Board Select ----

@injectable()
export class BoardSelectToolProvider implements ToolProvider {
  @inject(BoardsServiceProvider)
  protected boardsServiceProvider: BoardsServiceProvider;

  getTool(): ToolRequest {
    return {
      id: 'arduino-board-select',
      name: 'select_board',
      description:
        'Selects the board and port for the current sketch. Pass fqbn for the board and optionally a port address.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          fqbn: {
            type: 'string',
            description: 'The FQBN of the board to select (e.g. "arduino:avr:uno")',
          },
          port: {
            type: 'string',
            description: 'The port address to select (e.g. "COM3" or "/dev/ttyACM0")',
          },
        },
      },
      handler: async (argString: string) => {
        const args = JSON.parse(argString);
        const currentConfig =
          this.boardsServiceProvider.boardsConfig || emptyBoardsConfig;
        const update: Record<string, unknown> = {};
        if (args.fqbn) {
          update.selectedBoard = { fqbn: args.fqbn, name: args.fqbn.split(':').pop() || args.fqbn };
        }
        if (args.port) {
          update.selectedPort = { address: args.port, protocol: 'serial' };
        }
        this.boardsServiceProvider.updateConfig(update as any);
        return `Board selected: ${args.fqbn || currentConfig.selectedBoard?.fqbn || 'none'}, Port: ${args.port || currentConfig.selectedPort?.address || 'none'}`;
      },
    };
  }
}

// ---- Library Search ----

@injectable()
export class LibrarySearchToolProvider implements ToolProvider {
  @inject(LibraryService) protected libraryService: LibraryService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-lib-search',
      name: 'search_library',
      description:
        'Searches the Arduino library index for libraries matching a query. Returns library names, authors, and descriptions.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for the library (e.g. "servo", "WiFi", "sensor")',
          },
        },
      },
      handler: async (argString: string) => {
        const { query } = JSON.parse(argString);
        const results = await this.libraryService.search({
          query,
          type: 'All',
          topic: 'All',
        });
        return JSON.stringify(
          results.slice(0, 10).map((lib: LibraryPackage) => ({
            name: lib.name,
            author: lib.author,
            summary: lib.summary,
            description: lib.description,
            installedVersion: lib.installedVersion,
          })),
          null,
          2
        );
      },
    };
  }
}

// ---- Library Install ----

@injectable()
export class LibraryInstallToolProvider implements ToolProvider {
  @inject(LibraryService) protected libraryService: LibraryService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-lib-install',
      name: 'install_library',
      description:
        'Installs an Arduino library by name. Use search_library first to find the exact name.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The exact name of the library to install (e.g. "DHT sensor library")',
          },
          version: {
            type: 'string',
            description: 'Optional specific version to install',
          },
        },
      },
      handler: async (argString: string) => {
        const { name, version } = JSON.parse(argString);
        const results = await this.libraryService.search({
          query: name,
          type: 'All',
          topic: 'All',
        });
        const match = results.find(
          (lib: LibraryPackage) => lib.name.toLowerCase() === name.toLowerCase()
        );
        if (!match) {
          return `Library "${name}" not found. Try search_library first.`;
        }
        const installVersion = version || match.availableVersions[0];
        await this.libraryService.install({
          item: match,
          version: installVersion,
        });
        return `Installed library "${match.name}" version ${installVersion}`;
      },
    };
  }
}

// ---- Sketch Create ----

@injectable()
export class SketchCreateToolProvider implements ToolProvider {
  @inject(SketchesService) protected sketchesService: SketchesService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-sketch-create',
      name: 'create_sketch',
      description:
        'Creates a new Arduino sketch with a default template. Returns the sketch URI.',
      providerName: 'arduino-tools',
      handler: async () => {
        const sketch = await this.sketchesService.createNewSketch();
        return `Created sketch "${sketch.name}" at ${sketch.uri}`;
      },
    };
  }
}

// ---- Sketch Read ----

@injectable()
export class SketchReadToolProvider implements ToolProvider {
  @inject(EditorManager) protected editorManager: EditorManager;

  getTool(): ToolRequest {
    return {
      id: 'arduino-sketch-read',
      name: 'read_sketch',
      description:
        'Reads the content of the currently open sketch file. Returns the source code.',
      providerName: 'arduino-tools',
      handler: async () => {
        const editorWidget = this.editorManager.currentEditor;
        if (!editorWidget) {
          return 'No file is currently open.';
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (editorWidget.editor.document as any).getText();
      },
    };
  }
}

// ---- Compile (Verify) ----

@injectable()
export class CompileToolProvider implements ToolProvider {
  @inject(CoreService) protected coreService: CoreService;
  @inject(BoardsServiceProvider)
  protected boardsServiceProvider: BoardsServiceProvider;
  @inject(EditorManager) protected editorManager: EditorManager;
  @inject(SketchesService) protected sketchesService: SketchesService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-compile',
      name: 'compile_sketch',
      description:
        'Compiles (verifies) the currently open Arduino sketch. Returns compilation status and any errors.',
      providerName: 'arduino-tools',
      handler: async () => {
        const editorWidget = this.editorManager.currentEditor;
        if (!editorWidget) {
          return 'No sketch is open. Open or create a sketch first.';
        }
        const sketchUri = editorWidget.getResourceUri();
        if (!sketchUri) {
          return 'No sketch URI available.';
        }
        const sketch = await this.sketchesService.maybeLoadSketch(
          sketchUri.toString()
        );
        if (!sketch) {
          return 'The current file is not part of an Arduino sketch.';
        }
        const config =
          this.boardsServiceProvider.boardsConfig || emptyBoardsConfig;
        const fqbn = config.selectedBoard?.fqbn;
        if (!fqbn) {
          return 'No board selected. Use select_board first to choose a board.';
        }
        try {
          const summary = await this.coreService.compile({
            sketch,
            fqbn,
            verbose: false,
            optimizeForDebug: false,
            sourceOverride: {},
          });
          if (summary) {
            const sizeInfo = summary.executableSectionsSize
              .map(
                (s) =>
                  `${s.name}: ${s.size}/${s.maxSize} bytes (${Math.round((s.size / s.maxSize) * 100)}%)`
              )
              .join(', ');
            return `Compilation successful! ${sizeInfo ? 'Program size: ' + sizeInfo : ''}`;
          }
          return 'Compilation completed with no output.';
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return `Compilation failed: ${msg}`;
        }
      },
    };
  }
}

// ---- Upload ----

@injectable()
export class UploadToolProvider implements ToolProvider {
  @inject(CoreService) protected coreService: CoreService;
  @inject(BoardsServiceProvider)
  protected boardsServiceProvider: BoardsServiceProvider;
  @inject(EditorManager) protected editorManager: EditorManager;
  @inject(SketchesService) protected sketchesService: SketchesService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-upload',
      name: 'upload_sketch',
      description:
        'Uploads the compiled sketch to the selected board. Compile first, then upload.',
      providerName: 'arduino-tools',
      handler: async () => {
        const editorWidget = this.editorManager.currentEditor;
        if (!editorWidget) {
          return 'No sketch is open.';
        }
        const sketchUri = editorWidget.getResourceUri();
        if (!sketchUri) {
          return 'No sketch URI available.';
        }
        const sketch = await this.sketchesService.maybeLoadSketch(
          sketchUri.toString()
        );
        if (!sketch) {
          return 'The current file is not part of an Arduino sketch.';
        }
        const config =
          this.boardsServiceProvider.boardsConfig || emptyBoardsConfig;
        const fqbn = config.selectedBoard?.fqbn;
        if (!fqbn) {
          return 'No board selected. Use select_board first.';
        }
        const port = config.selectedPort?.address;
        if (!port) {
          return 'No port selected. Connect a board and select a port first.';
        }
        try {
          const response = await this.coreService.upload({
            sketch,
            fqbn,
            port: { address: port, protocol: 'serial' },
            verbose: false,
            verify: true,
            programmer: undefined,
            userFields: [],
          });
          return `Upload successful to ${response.portAfterUpload.address}!`;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return `Upload failed: ${msg}`;
        }
      },
    };
  }
}

// ---- Serial Monitor ----

@injectable()
export class SerialMonitorToolProvider implements ToolProvider {
  @inject(BoardsServiceProvider)
  protected boardsServiceProvider: BoardsServiceProvider;
  @inject(BoardsService)
  protected boardsService: BoardsService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-serial-monitor',
      name: 'serial_monitor',
      description:
        'Manages the serial monitor. Use action "status" to check connection state and board info, "send" to write a message to the serial port of the connected board.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: '"status" to check serial monitor state and board info, "send" to write a message',
          },
          message: {
            type: 'string',
            description: 'The message to send to serial (required when action is "send")',
          },
        },
      },
      handler: async (argString: string) => {
        const args = JSON.parse(argString);
        const action = args.action || 'status';

        const config =
          this.boardsServiceProvider.boardsConfig || emptyBoardsConfig;
        const board = config.selectedBoard;
        const port = config.selectedPort;

        if (action === 'send') {
          if (!args.message) {
            return 'No message provided. Pass a "message" parameter to send.';
          }
          if (!board?.fqbn) {
            return 'No board selected. Select a board first.';
          }
          if (!port?.address) {
            return 'No port selected. Connect a board and select a port first.';
          }
          return [
            `Board: ${board.name || board.fqbn} on ${port.address}`,
            `Message to send: "${args.message}"`,
            '',
            'To send this message, open the Serial Monitor panel (View > Serial Monitor).',
            'Type your message in the input field at the bottom and press Enter.',
          ].join('\n');
        }

        // status
        const statusParts: string[] = [];
        if (board) {
          statusParts.push(`Board: ${board.name || 'unknown'} (FQBN: ${board.fqbn || 'none'})`);
        } else {
          statusParts.push('Board: No board selected');
        }
        if (port) {
          statusParts.push(`Port: ${port.address} (${port.protocol || 'serial'})`);
        } else {
          statusParts.push('Port: No port detected');
        }

        try {
          const platforms = await this.boardsService.getInstalledPlatforms();
          if (platforms && platforms.length > 0) {
            statusParts.push(`Installed platforms: ${platforms.map((p) => p.name || p.id).join(', ')}`);
          }
        } catch {
          // Ignore errors
        }

        statusParts.push('');
        statusParts.push('Tip: Use View > Serial Monitor (Ctrl+Shift+M) for real-time serial output.');

        return statusParts.join('\n');
      },
    };
  }
}

// ---- Library Uninstall ----

@injectable()
export class LibraryUninstallToolProvider implements ToolProvider {
  @inject(LibraryService) protected libraryService: LibraryService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-lib-uninstall',
      name: 'uninstall_library',
      description:
        'Uninstalls an installed Arduino library by name. Use search_library or list installed libraries first to find the exact name.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The exact name of the library to uninstall',
          },
        },
      },
      handler: async (argString: string) => {
        const { name } = JSON.parse(argString);
        const installed = await this.libraryService.list({
          libraryName: name,
        });
        const match = installed.find(
          (lib: LibraryPackage) => lib.name.toLowerCase() === name.toLowerCase()
        );
        if (!match) {
          return `Library "${name}" is not installed or not found.`;
        }
        try {
          await this.libraryService.uninstall({ item: match });
          return `Uninstalled library "${match.name}" successfully.`;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return `Failed to uninstall library "${name}": ${msg}`;
        }
      },
    };
  }
}

// ---- Board Manager Install ----

@injectable()
export class BoardManagerInstallToolProvider implements ToolProvider {
  @inject(BoardsService) protected boardsService: BoardsService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-board-install',
      name: 'install_board_platform',
      description:
        'Searches for and installs board platform packages (e.g. ESP32, RP2040, STM32). Use this to add board support beyond the default Arduino AVR boards.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for the board platform (e.g. "esp32", "esp8266", "rp2040")',
          },
          version: {
            type: 'string',
            description: 'Optional specific version to install (e.g. "2.0.5"). If omitted, installs the latest.',
          },
        },
      },
      handler: async (argString: string) => {
        const { query, version } = JSON.parse(argString);
        const searchResults = await this.boardsService.searchBoards({ query });
        if (!searchResults || searchResults.length === 0) {
          return `No board platforms found matching "${query}".`;
        }

        // Collect unique platform IDs from the search results
        const platformIds = new Map<string, string>(); // platformId string -> display name
        for (const result of searchResults) {
          if (result.packageId) {
            const platformIdStr = `${result.packageId.vendorId}:${result.packageId.arch}`;
            if (!platformIds.has(platformIdStr)) {
              platformIds.set(platformIdStr, result.packageName || platformIdStr);
            }
          }
        }

        if (platformIds.size === 0) {
          return `Found boards matching "${query}" but could not resolve platform packages. Try a different search term.`;
        }

        // Also check currently installed platforms
        const installedPlatforms = await this.boardsService.getInstalledPlatforms();
        const installedIds = new Set(installedPlatforms.map((p) => p.id));

        const results: string[] = [];
        for (const [platformIdStr, displayName] of platformIds) {
          if (installedIds.has(platformIdStr)) {
            const installedPkg = installedPlatforms.find((p) => p.id === platformIdStr);
            results.push(`"${displayName}" (${platformIdStr}) is already installed (v${installedPkg?.installedVersion || 'unknown'}).`);
            continue;
          }
          try {
            const pkg = await this.boardsService.getBoardPackage({ id: platformIdStr });
            if (!pkg) {
              results.push(`Could not find package info for "${displayName}" (${platformIdStr}).`);
              continue;
            }
            const installVersion = version || pkg.availableVersions?.[0];
            await this.boardsService.install({
              item: pkg,
              version: installVersion,
            });
            results.push(`Installed "${pkg.name}" (${platformIdStr}) v${installVersion || 'latest'}.`);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push(`Failed to install "${displayName}" (${platformIdStr}): ${msg}`);
          }
        }

        return results.join('\n');
      },
    };
  }
}

// ---- File Explorer ----

@injectable()
export class FileExplorerToolProvider implements ToolProvider {
  @inject(WorkspaceService) protected workspaceService: WorkspaceService;
  @inject(FileService) protected fileService: FileService;

  getTool(): ToolRequest {
    return {
      id: 'arduino-file-explorer',
      name: 'explore_files',
      description:
        'Lists files and directories in the workspace or a specific path. Returns file names, types (file/directory), and sizes. Use to browse project files.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path from workspace root (e.g. "src", "lib"). Omit to list workspace root.',
          },
        },
      },
      handler: async (argString: string) => {
        const { path: relPath } = JSON.parse(argString);
        const workspace = this.workspaceService.workspace;
        if (!workspace || !workspace.resource) {
          return 'No workspace is open. Open a folder first.';
        }
        const rootUri = workspace.resource;
        const targetUri = relPath
          ? rootUri.resolve(relPath)
          : rootUri;

        try {
          const stat = await this.fileService.resolve(targetUri);
          if (stat.isFile) {
            const content = await this.fileService.readFile(targetUri);
            return `File: ${targetUri.toString()}\nSize: ${stat.size} bytes\n\n${content.value.toString()}`;
          }

          if (stat.isDirectory && stat.children) {
            const entries = stat.children
              .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.resource.toString().localeCompare(b.resource.toString());
              })
              .map((child) => {
                const fullPath = child.resource.path.base;
                const segments = fullPath.split('/');
                const name = segments[segments.length - 1] || fullPath;
                const prefix = child.isDirectory ? '  [DIR] ' : '        ';
                const size = child.isDirectory
                  ? ''
                  : ` (${child.size} bytes)`;
                return `${prefix}${name}${size}`;
              });
            const pathDisplay = relPath || '/';
            return `Contents of ${pathDisplay}:\n${entries.join('\n')}`;
          }

          return `Path "${targetUri.path}" exists but is neither a file nor a directory.`;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          return `Failed to explore path: ${msg}`;
        }
      },
    };
  }
}

// ---- Code Edit ----

@injectable()
export class CodeEditToolProvider implements ToolProvider {
  @inject(EditorManager) protected editorManager: EditorManager;

  getTool(): ToolRequest {
    return {
      id: 'arduino-code-edit',
      name: 'edit_code',
      description:
        'Edits the currently open file. Can replace specific text or append code. Use read_sketch first to see the current content, then use this to make changes.',
      providerName: 'arduino-tools',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: '"replace" to find and replace text, "append" to add code at the end, "replace_all" to replace all occurrences',
          },
          find: {
            type: 'string',
            description: 'Text to find (required for "replace" and "replace_all")',
          },
          replace_with: {
            type: 'string',
            description: 'Replacement text (required for "replace", "replace_all", and "append")',
          },
        },
      },
      handler: async (argString: string) => {
        const args = JSON.parse(argString);
        const editorWidget = this.editorManager.currentEditor;
        if (!editorWidget) {
          return 'No file is currently open. Open a file first.';
        }

        const editor = editorWidget.editor;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monacoEditor = (editorWidget as any).editor;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = monacoEditor?.getModel?.() || (editor.document as any).textEditorModel;

        if (!model) {
          return 'Could not access the editor model. Make sure a file is open.';
        }

        const action = args.action;
        const replaceWith = args.replace_with || '';

        if (action === 'append') {
          const currentContent = model.getValue();
          const newContent = currentContent + replaceWith;
          model.setValue(newContent);
          return `Appended ${replaceWith.length} characters to the file.`;
        }

        if (action === 'replace') {
          const find = args.find;
          if (!find) {
            return 'No "find" text provided. Pass a "find" parameter with the text to search for.';
          }
          const currentContent = model.getValue();
          const index = currentContent.indexOf(find);
          if (index === -1) {
            return `Text "${find.substring(0, 50)}${find.length > 50 ? '...' : ''}" not found in the file.`;
          }
          const newContent = currentContent.substring(0, index) + replaceWith + currentContent.substring(index + find.length);
          model.setValue(newContent);
          return `Replaced first occurrence of text (${find.length} chars → ${replaceWith.length} chars).`;
        }

        if (action === 'replace_all') {
          const find = args.find;
          if (!find) {
            return 'No "find" text provided.';
          }
          const currentContent = model.getValue();
          const count = currentContent.split(find).length - 1;
          if (count === 0) {
            return `Text "${find.substring(0, 50)}${find.length > 50 ? '...' : ''}" not found in the file.`;
          }
          const newContent = currentContent.split(find).join(replaceWith);
          model.setValue(newContent);
          return `Replaced ${count} occurrences of text.`;
        }

        return `Unknown action "${action}". Use "replace", "replace_all", or "append".`;
      },
    };
  }
}
