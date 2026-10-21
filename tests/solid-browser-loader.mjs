/**
 * Resolve solid-js with the "browser" condition.
 *
 * Under Node, solid-js resolves to its server build, where createMemo
 * computes once and never re-runs. Tests that check reactive behavior
 * register this hook so they get the same build the app ships with.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'solid-js' || specifier.startsWith('solid-js/')) {
    return nextResolve(specifier, {
      ...context,
      conditions: ['browser', ...context.conditions]
    })
  }
  return nextResolve(specifier, context)
}
