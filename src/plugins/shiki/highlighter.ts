import { createHighlighter, Highlighter, BundledLanguage, BundledTheme, bundledLanguages, bundledThemes } from 'shiki'
import { findChildren } from '@tiptap/core'
import { Node as ProsemirrorNode } from '@tiptap/pm/model'
import ayuLight from './theme/ayu-light.json'

let highlighter: Highlighter | undefined
let highlighterPromise: Promise<void> | undefined
const loadingLanguages = new Set<BundledLanguage>()
const loadingThemes = new Set<BundledTheme>()

type HighlighterOptions = {
  themes: (BundledTheme | null | undefined)[]
  languages: (BundledLanguage | null | undefined)[]
}

export function resetHighlighter() {
  highlighter = undefined
  highlighterPromise = undefined
  loadingLanguages.clear()
  loadingThemes.clear()
}

export function getShiki() {
  return highlighter
}

export function loadHighlighter(opts: HighlighterOptions) {
  if (!highlighter && !highlighterPromise) {
    const themes: any = [
      ayuLight,
      ...opts.themes.filter((theme): theme is BundledTheme => !!theme && theme in bundledThemes),
    ]
    const langs = opts.languages.filter((lang): lang is BundledLanguage => !!lang && lang in bundledLanguages)
    highlighterPromise = createHighlighter({ themes, langs }).then(h => {
      highlighter = h
    })
    return highlighterPromise
  }

  if (highlighterPromise) {
    return highlighterPromise
  }
}

export async function loadTheme(theme: BundledTheme) {
  if (
    highlighter &&
    !highlighter.getLoadedThemes().includes(theme) &&
    !loadingThemes.has(theme) &&
    theme in bundledThemes
  ) {
    loadingThemes.add(theme)
    await highlighter.loadTheme(theme)
    loadingThemes.delete(theme)
    return true
  }

  return false
}

export async function loadLanguage(language: BundledLanguage) {
  if (
    highlighter &&
    !highlighter.getLoadedLanguages().includes(language) &&
    !loadingLanguages.has(language) &&
    language in bundledLanguages
  ) {
    loadingLanguages.add(language)
    await highlighter.loadLanguage(language)
    loadingLanguages.delete(language)
    return true
  }

  return false
}

export async function initHighlighter({ doc, name }: { doc: ProsemirrorNode; name: string }) {
  const codeBlocks = findChildren(doc, node => node.type.name === name)

  const themes = [...codeBlocks.map(block => block.node.attrs.theme as BundledTheme)]
  const languages = [...codeBlocks.map(block => block.node.attrs.language as BundledLanguage)]

  if (!highlighter) {
    const loader = loadHighlighter({ languages, themes })
    await loader
  } else {
    await Promise.all([
      ...themes.flatMap(theme => loadTheme(theme)),
      ...languages.flatMap(language => !!language && loadLanguage(language)),
    ])
  }
}
