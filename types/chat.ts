export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
  timestamp: string
}

export const STARTER_QUESTIONS = [
  'What are the main trends in this data?',
  'Which columns stand out the most?',
  'Summarize the key findings in plain English.',
  'What should I investigate next?',
]
