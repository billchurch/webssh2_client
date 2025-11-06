import { readFile } from 'node:fs/promises'
import ts from 'typescript'

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.endsWith('.ts')) {
    const url = new URL(specifier, context.parentURL)
    return { shortCircuit: true, url: url.href }
  }
  if (specifier.endsWith('.js')) {
    const tsCandidate = new URL(
      specifier.replace(/\.js$/, '.ts'),
      context.parentURL
    )
    try {
      await readFile(tsCandidate)
      return { shortCircuit: true, url: tsCandidate.href }
    } catch {
      // fall back to default resolution
    }
  }
  return defaultResolve(specifier, context, defaultResolve)
}

export async function load(url, context, defaultLoad) {
  if (url.endsWith('.ts')) {
    const source = await readFile(new URL(url), 'utf8')
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true
      },
      fileName: url
    })
    return { format: 'module', source: transpiled.outputText, shortCircuit: true }
  }
  return defaultLoad(url, context, defaultLoad)
}
