/** items üzerinde en fazla `limit` eşzamanlı fn çalıştırır; tek bir hatanın diğerlerini durdurmasına izin vermez. */
export async function forEachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const run = async () => {
    while (next < items.length) await fn(items[next++]).catch(() => {});
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
}
