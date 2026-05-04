export async function generateMockResponse(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  return 'The server is busy. Please try again later.'
}
