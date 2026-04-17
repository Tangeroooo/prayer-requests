export interface ReturnToState {
  from?: string
}

export const createReturnToState = (pathname: string, search = '', hash = ''): ReturnToState => ({
  from: `${pathname}${search}${hash}`,
})

export const hasReturnToState = (state: unknown): state is ReturnToState => {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return false
  }

  const from = (state as ReturnToState).from

  return typeof from === 'string' && from.length > 0
}

export const getReturnToPath = (state: unknown, fallbackPath: string) => {
  if (!hasReturnToState(state)) {
    return fallbackPath
  }

  return state.from ?? fallbackPath
}
