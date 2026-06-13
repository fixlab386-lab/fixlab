import { useEffect, useState } from 'react'
import { ensureDefaultAgents, getAgents } from '../../lib/firestore'
import type { Agent } from '../../types'

export const DEFAULT_AGENT_LABEL = '(Nessuno)'

export function agentNamesFromList(agents: Agent[]): string[] {
  return [DEFAULT_AGENT_LABEL, ...agents.filter(a => a.isActive !== false).map(a => a.name)]
}

export function useAgentOptions(studioId: string | null | undefined): string[] {
  const [options, setOptions] = useState<string[]>([DEFAULT_AGENT_LABEL, 'Agente 1', 'Agente 2', 'Agente 3'])

  useEffect(() => {
    if (!studioId) return
    let cancelled = false
    ensureDefaultAgents(studioId)
      .then(list => {
        if (!cancelled) setOptions(agentNamesFromList(list))
      })
      .catch(() => {
        if (!cancelled) setOptions([DEFAULT_AGENT_LABEL])
      })
    return () => {
      cancelled = true
    }
  }, [studioId])

  return options
}

export async function refreshAgentOptions(studioId: string): Promise<string[]> {
  const list = await getAgents(studioId)
  return agentNamesFromList(list)
}
