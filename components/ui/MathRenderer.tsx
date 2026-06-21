'use client'
import { InlineMath, BlockMath } from 'react-katex'
import React from 'react'

interface Props { children: string; className?: string }

export default function MathRenderer({ children, className }: Props) {
  if (!children) return null
  const parts = parseMathString(children)
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'inline') return <span key={i} className="mx-0.5"><KatexErrorBoundary inline latex={part.content}/></span>
        if (part.type === 'block') return <span key={i} className="block math-block my-2 overflow-x-auto"><KatexErrorBoundary inline={false} latex={part.content}/></span>
        return <span key={i}>{part.content}</span>
      })}
    </span>
  )
}

class KatexErrorBoundary extends React.Component<{ latex: string; inline: boolean }, { hasError: boolean }> {
  constructor(props: { latex: string; inline: boolean }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">{this.props.latex}</code>
    return this.props.inline ? <InlineMath math={this.props.latex}/> : <BlockMath math={this.props.latex}/>
  }
}

interface TextPart { type: 'text' | 'inline' | 'block'; content: string }

function parseMathString(text: string): TextPart[] {
  const parts: TextPart[] = []
  const regex = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    if (match[1] !== undefined) parts.push({ type: 'block', content: match[1].trim() })
    else if (match[2] !== undefined) parts.push({ type: 'inline', content: match[2].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push({ type: 'text', content: text.slice(lastIndex) })
  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}

export function mathToSpeech(text: string): string {
  return text
    .replace(/\$\$([^$]+?)\$\$/g, (_, m) => mathExprToWords(m))
    .replace(/\$([^$\n]+?)\$/g, (_, m) => mathExprToWords(m))
}

function mathExprToWords(expr: string): string {
  return expr
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\sqrt/g, 'square root')
    .replace(/\\pm/g, 'plus or minus')
    .replace(/\\times/g, ' times ')
    .replace(/\\div/g, ' divided by ')
    .replace(/\\leq/g, ' less than or equal to ')
    .replace(/\\geq/g, ' greater than or equal to ')
    .replace(/\\neq/g, ' not equal to ')
    .replace(/\\pi/g, 'pi').replace(/\\theta/g, 'theta').replace(/\\alpha/g, 'alpha')
    .replace(/\\beta/g, 'beta').replace(/\\infty/g, 'infinity').replace(/\\cdot/g, ' dot ')
    .replace(/\^2/g, ' squared').replace(/\^3/g, ' cubed')
    .replace(/\^\{([^}]+)\}/g, ' to the power of $1')
    .replace(/\^([a-zA-Z0-9])/g, ' to the power of $1')
    .replace(/[_{}\\]/g, ' ').replace(/\s+/g, ' ').trim()
}
