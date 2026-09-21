export function useHHMMSSFormat(date: Date) {
  return computed(() => dayjs(date).format('HH:mm:ss'))
}
