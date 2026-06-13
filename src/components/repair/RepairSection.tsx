import type { ReactNode } from 'react'

type RepairSectionProps = {
  title: string
  children: ReactNode
  id?: string
}

export default function RepairSection({ title, children, id }: RepairSectionProps) {
  return (
    <section className="gestionale-repair-section" id={id}>
      <h2 className="gestionale-repair-section__title">{title}</h2>
      <div className="gestionale-repair-section__body">{children}</div>
    </section>
  )
}
