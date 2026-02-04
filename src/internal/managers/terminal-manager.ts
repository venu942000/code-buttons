import * as vscode from "vscode";
import { DEFAULT_TERMINAL_BASE_NAME, TERMINAL_NAME_PREFIX } from "../../shared/constants";
import { ButtonConfig, CommandButton, isCommandButton } from "../../shared/types";
import { TerminalExecutor } from "../adapters";
import { EventBus } from "../event-bus";

const isButtonConfig = (obj: unknown): obj is ButtonConfig => {
  if (obj === null || typeof obj !== "object" || !("id" in obj) || !("name" in obj)) {
    return false;
  }

  const btn = obj as { command?: unknown; group?: unknown };
  return typeof btn.command === "string" || Array.isArray(btn.group);
};

const hasInsertOnly = (button: ButtonConfig): button is CommandButton =>
  isCommandButton(button) && button.insertOnly === true;

export const shouldCreateNewTerminal = (terminal: vscode.Terminal | undefined): boolean => {
  return !terminal || !!terminal.exitStatus;
};

export const determineTerminalName = (
  customTerminalName: string | undefined,
  baseName: string
): string => {
  return customTerminalName ?? `${TERMINAL_NAME_PREFIX} ${baseName}`;
};

export class TerminalManager {
  private disposables: vscode.Disposable[] = [];
  private terminals = new Map<string, vscode.Terminal>();

  constructor(private readonly eventBus?: EventBus) {
    this.disposables.push(vscode.window.onDidCloseTerminal(this.cleanupClosedTerminal.bind(this)));
  }

  static create = (eventBus?: EventBus): TerminalManager => new TerminalManager(eventBus);

  dispose = () => {
    for (const terminal of this.terminals.values()) {
      terminal.dispose();
    }
    this.terminals.clear();
    this.disposables.forEach((d) => d.dispose());
  };

  executeCommand: TerminalExecutor = (
    command,
    useVsCodeApi = false,
    customTerminalName,
    buttonName,
    buttonRef,
    newTerminal = false
  ) => {
    if (useVsCodeApi) {
      vscode.commands.executeCommand(command);
      return;
    }

    const baseName = DEFAULT_TERMINAL_BASE_NAME;
    const terminalName = determineTerminalName(customTerminalName, baseName);
    const shouldExecute = !isButtonConfig(buttonRef) || !hasInsertOnly(buttonRef);

    if (newTerminal) {
      const terminal = vscode.window.createTerminal(terminalName);
      this.eventBus?.emit("terminal:created", { terminalName });
      terminal.show();
      terminal.sendText(command, shouldExecute);
      return;
    }

    const terminalKey = JSON.stringify({
      terminalName,
      useVsCodeApi,
    });

    let terminal = this.terminals.get(terminalKey);

    if (shouldCreateNewTerminal(terminal)) {
      terminal = vscode.window.createTerminal(terminalName);
      this.terminals.set(terminalKey, terminal);
      this.eventBus?.emit("terminal:created", { terminalName });
    }

    terminal!.show();
    terminal!.sendText(command, shouldExecute);
  };

  private cleanupClosedTerminal(closedTerminal: vscode.Terminal) {
    for (const [key, terminal] of this.terminals.entries()) {
      if (terminal === closedTerminal) {
        this.terminals.delete(key);
        break;
      }
    }
  }

}
