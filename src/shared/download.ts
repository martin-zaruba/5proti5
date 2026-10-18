/** Offers text as a file download (export of question sets). */
export function downloadText(fileName: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Revoking right away can cancel the download in some browsers – give it time to start.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
