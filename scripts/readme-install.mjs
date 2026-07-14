export function findVersionPinnedInstallCommands(markdown) {
  return [...markdown.matchAll(/agent-context-lens@(?!latest\b)[^\s`]+/g)].map(match => match[0]);
}
