declare module 'react-katex' {
  import { FC } from 'react'
  interface KaTeXProps {
    math: string
    block?: boolean
    errorColor?: string
    renderError?: (error: Error | TypeError) => React.ReactNode
    settings?: Record<string, unknown>
    as?: string
  }
  export const InlineMath: FC<KaTeXProps>
  export const BlockMath: FC<KaTeXProps>
}
