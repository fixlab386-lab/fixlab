declare module '7zip-bin' {
  const sevenBin: { path7za: string }
  export default sevenBin
}

declare module 'adm-zip' {
  export default class AdmZip {
    constructor(buffer?: Buffer | string)
    extractAllTo(targetPath: string, overwrite?: boolean): void
  }
}

declare module 'node-firebird' {
  export interface Database {
    query(sql: string, params: unknown[], callback: (err: Error | null, result: unknown[]) => void): void
    detach(callback: (err: Error | null) => void): void
  }

  export function attach(
    options: Record<string, unknown>,
    callback: (err: Error | null, db: Database) => void,
  ): void

  const Firebird: {
    attach: typeof attach
  }
  export default Firebird
}
