// Builds the message list sent to Anthropic, kept as pure logic so it can be
// unit-tested outside Deno.
//
// The API requires the first message to be from the user and roles to
// alternate. A plain `slice(-20)` breaks both: once a conversation passes the
// cap the window often opens on an assistant reply, and the request fails.
// So the window is moved forward to the nearest user turn instead of being
// reset, which costs at most one message of context and never more tokens.

export const MAX_HISTORY_MESSAGES = 20
export const MAX_MESSAGE_LENGTH = 2000

export type ChatMessage = { role: string; content: string }

export function buildHistory(
  messages: ChatMessage[],
  max = MAX_HISTORY_MESSAGES,
  maxLength = MAX_MESSAGE_LENGTH,
): ChatMessage[] {
  const cleaned: ChatMessage[] = []

  for (const message of messages) {
    if (message?.role !== 'user' && message?.role !== 'assistant') continue
    const content = typeof message.content === 'string' ? message.content.trim() : ''
    if (content === '') continue   // an empty turn is not a valid content block

    const previous = cleaned[cleaned.length - 1]
    if (previous && previous.role === message.role) {
      // Two turns from the same side: join them rather than reject the request.
      // The newest text is what the reply hangs on, so that end is kept.
      previous.content = `${previous.content}\n\n${content}`.slice(-maxLength)
    } else {
      cleaned.push({ role: message.role, content: content.slice(0, maxLength) })
    }
  }

  let start = Math.max(0, cleaned.length - max)
  while (start < cleaned.length && cleaned[start].role !== 'user') start++
  return cleaned.slice(start)
}
