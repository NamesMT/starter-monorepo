import { sample } from '@namesmt/utils'

export function getThoughtPlaceholders() {
  const { ts } = useI18n()

  return [
    ts('getInputThoughtsPlaceholders.0'),
    ts('getInputThoughtsPlaceholders.1'),
    ts('getInputThoughtsPlaceholders.2'),
    ts('getInputThoughtsPlaceholders.3'),
    ts('getInputThoughtsPlaceholders.4'),
    ts('getInputThoughtsPlaceholders.5'),
    ts('getInputThoughtsPlaceholders.6'),
    ts('getInputThoughtsPlaceholders.7'),
    ts('getInputThoughtsPlaceholders.8'),
  ]
}

export function getRandomThoughtPlaceholder() {
  return sample(getThoughtPlaceholders(), 1)[0]
}
