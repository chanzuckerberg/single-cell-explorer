export class UITool {
  constructor(
    public name: string,
    private action: (args?: Record<string, string>) => Promise<string>
  ) {}

  async invoke(argsJson: string): Promise<string> {
    const args = argsJson ? JSON.parse(argsJson) : undefined;
    return this.action(args);
  }
}
