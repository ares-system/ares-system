import chalk from "chalk";

/**
 * ASST Terminal Theme
 * Terracotta: #B54C38
 * Coral: #E67E6B
 * Deep Charcoal: #1E1E1C
 */
export const theme = {
  brand: chalk.hex("#B54C38"),
  accent: chalk.hex("#E67E6B"),
  dim: chalk.hex("#1E1E1C"),
  text: chalk.hex("#FAf9F5"),
  
  error: chalk.red.bold,
  success: chalk.green.bold,
  warning: chalk.yellow.bold,
  info: chalk.cyan,
  
  header: (text: string) => chalk.hex("#B54C38").bold(text),
  repo: (text: string) => chalk.hex("#E67E6B").italic(text),
};
