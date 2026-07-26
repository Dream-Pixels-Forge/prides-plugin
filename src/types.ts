export interface PridesPluginInput {
  directory: string;
}

export interface PridesTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any) => Promise<any>;
}

export interface PluginResult {
  name: string;
  tools: PridesTool[];
}
