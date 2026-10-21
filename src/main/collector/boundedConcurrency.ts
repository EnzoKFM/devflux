export async function mapWithBoundedConcurrency<Item, Result>(
  items: Item[],
  maxConcurrency: number,
  processItem: (item: Item) => Promise<Result>
): Promise<Result[]> {
  const results: Result[] = new Array(items.length)
  let nextItemIndex = 0

  async function runWorker(): Promise<void> {
    while (nextItemIndex < items.length) {
      const itemIndex = nextItemIndex
      nextItemIndex += 1
      results[itemIndex] = await processItem(items[itemIndex])
    }
  }

  const workerCount = Math.min(maxConcurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, runWorker))
  return results
}
