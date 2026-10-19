const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+': (?:Error: )?/

export function describeError(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const message = rawMessage.replace(IPC_ERROR_PREFIX, '').trim()
  return message.length > 0 ? message : 'Une erreur inattendue est survenue.'
}
