export function debounce<F extends (...args: any[]) => void>(
  fn: F,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<F>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
