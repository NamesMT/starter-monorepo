export function useInputThoughtsPlaceholders() {
  const { $i18n } = useNuxtApp()

  return computed(() => [
    $i18n.t('getInputThoughtsPlaceholders.0'),
    $i18n.t('getInputThoughtsPlaceholders.1'),
    $i18n.t('getInputThoughtsPlaceholders.2'),
    $i18n.t('getInputThoughtsPlaceholders.3'),
    $i18n.t('getInputThoughtsPlaceholders.4'),
    $i18n.t('getInputThoughtsPlaceholders.5'),
    $i18n.t('getInputThoughtsPlaceholders.6'),
    $i18n.t('getInputThoughtsPlaceholders.7'),
    $i18n.t('getInputThoughtsPlaceholders.8'),
  ])
}
