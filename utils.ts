function fibonacci(n: number): number[] {
  const fib = [0, 1]
  for (let i = 2; i <= n; i++) {
    fib.push(fib[i - 1] + fib[i - 2])
  }
  return fib
}
const fibBase = fibonacci(20)
// fibonacci(10) // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]
/**
 *
 * @param years_kept_exc a `0` returns 3 since it means the first year of keeping a player
 * @returns
 */
export function getKeeperInc(years_kept_exc: number) {
  let newInc = fibBase.slice(4 + years_kept_exc, 5 + years_kept_exc)
  return newInc[0]
}
// getKeeperInc(0) // 3
// getKeeperInc(1) // 5
// getKeeperInc(2) // 8
// getKeeperInc(3) // 13
// getKeeperInc(4) // 21
