export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const PROJECT_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function validateProjectId(id: unknown): ValidationResult {
  if (typeof id !== "string" || id.length === 0) {
    return { valid: false, error: "Project ID is required" };
  }
  if (id.length > 128) {
    return { valid: false, error: "Project ID must be 128 characters or fewer" };
  }
  if (!PROJECT_ID_RE.test(id)) {
    return {
      valid: false,
      error: "Project ID may only contain letters, numbers, hyphens, and underscores",
    };
  }
  if (id.includes("..")) {
    return { valid: false, error: "Project ID must not contain path traversal sequences" };
  }
  return { valid: true };
}

export function validateCommand(command: unknown): ValidationResult {
  if (typeof command !== "string" || command.length === 0) {
    return { valid: false, error: "Command is required" };
  }
  if (command.length > 128) {
    return { valid: false, error: "Command must be 128 characters or fewer" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(command)) {
    return {
      valid: false,
      error: "Command may only contain letters, numbers, hyphens, and underscores",
    };
  }
  return { valid: true };
}