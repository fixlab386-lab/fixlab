import { useEffect, useState } from 'react'
import { ensureDefaultAgents, getAgents } from '../../lib/firestore'
import type { Agent } from '../../types'

export const DEFAULT_AGENT_LABEL = '(Nessuno)'

export function agentNamesFromList(agents: Agent[]): string[] {
  return [DEFAULT_AGENT_LABEL, ...agents.filter(a => a.isActive !== false).map(a => a.name)]
}

export function useAgentOptions(studioId: string | null | undefined, refreshKey = 0): string[] {
  const agents = useAgents(studioId, refreshKey)
  return agentNamesFromList(agents)
}

export function useAgents(studioId: string | null | undefined, refreshKey = 0): Agent[] {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    if (!studioId) {
      setAgents([])
      return
    }
    let cancelled = false
    ensureDefaultAgents(studioId)
      .then(list => {
        if (!cancelled) setAgents(list)
      })
      .catch(() => {
        if (!cancelled) setAgents([])
      })
    return () => {
      cancelled = true
    }
  }, [studioId, refreshKey])

  return agents
}

export async function refreshAgentOptions(studioId: string): Promise<string[]> {
  const list = await getAgents(studioId)
  return agentNamesFromList(list)
}
