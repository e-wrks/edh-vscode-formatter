
import { TextDocument, Range, TextEdit, ProviderResult } from 'vscode'

export function formatEdhLines(
  document: TextDocument, range: Range,
): ProviderResult<TextEdit[]> {
  const sinceLine = range.start.line
  const beforeLine = Math.min(document.lineCount, range.end.line + 1)

  let fmtResult = ''
  let currCtx: EdhSrcContext = { scope: EdhSrcScope.Code }
  let bracketStack: string[] = []
  let currIndent = '', nextIndent = ''
  let blankLineCnt = 0 // number of adjacent blank lines 

  for (let lineIdx = 0; lineIdx < beforeLine; lineIdx++, currIndent = nextIndent) {
    let line = document.lineAt(lineIdx).text

    let lineResult = ''

    function appendLineResult(moreResult: string): void {
      if (lineResult.length > 0) { // after some content, insert a space
        lineResult += ' ' + moreResult
      } else { // the very first content on this line
        lineResult = moreResult
      }
    }

    if (EdhSrcScope.String === currCtx.scope) {
      const [strRest, afterStr] = finishStrLit(line, currCtx.delimiter)
      if (null === afterStr) { // string not finished in this line
        if (lineIdx >= sinceLine) {
          fmtResult += line.trimRight() + '\n'
        }
        continue
      }
      // string finished in this line
      currIndent = ''
      lineResult = strRest
      line = afterStr.trimLeft()
      // trnasfer to code
      currCtx = { scope: EdhSrcScope.Code }
    }

    const [, lineIndent, lineSrc,] = <string[]> // it's guaranteed to match
      /^(\s*)(.*)$/[Symbol.match](line)

    if (!lineSrc && !lineResult) { // a blank line
      if (lineIdx < sinceLine) { // not to be changed
        blankLineCnt++
        continue
      }
      if (blankLineCnt < 2) { // not too many of blank lines
        fmtResult += '\n' // one more blank line
      }
      blankLineCnt++
      continue
    }
    // not a blank line
    blankLineCnt = 0
    if (lineIdx < sinceLine) { // accept what can't be changed
      nextIndent = lineIndent
    }

    function popBracket(openTag: string) {
      const t = bracketStack.pop()
      if (undefined === t) {
        // extranous closing bracket, ignore
      } else if (t !== openTag) {
        // unmatched closing bracket, ignore
        bracketStack.push(t)
      } else {
        // decrease 1 level (2 spaces) of indent
        nextIndent = nextIndent.substring(2)
        if (!lineResult) {
          // closing bracket is leading the line, unindent from this line on
          currIndent = nextIndent
        }
      }
    }

    for (let restSrc = lineSrc; restSrc;) {

      if (EdhSrcScope.Comment === currCtx.scope) {
        const cmtCloseIdx = restSrc.indexOf('#}')
        if (cmtCloseIdx < 0) {
          const cmtLine = restSrc.trim()
          if (cmtLine.startsWith('#')) {
            appendLineResult(' ' + cmtLine)
          } else {
            appendLineResult(cmtLine)
          }
          restSrc = '' // done with this line
        }
        else { // block comment finished in this line
          const cmtContent = restSrc.substring(0, cmtCloseIdx + 2).trimLeft()
          appendLineResult(' ' + cmtContent)
          restSrc = restSrc.substring(cmtCloseIdx + 2).trimLeft()
          // trnasfer to code
          currCtx = { scope: EdhSrcScope.Code }
        }
        continue
      }

      const [, cmtTag, cmtRest] = <string[]>
        /^({#|#)?(.*)$/[Symbol.match](restSrc)
      switch (cmtTag) {
        case '#': // line comment
          appendLineResult(restSrc.trimRight())
          restSrc = '' // done with this line
          break
        case '{#': // start of block comment
          const [, cmtContent, cmtClose, afterCmt] = <string[]>
            /^(.*)(#})?(.*)$/[Symbol.match](cmtRest)
          if ('#}' === cmtClose) { // block comment finished in this line
            appendLineResult('{#' + cmtContent + '#}')
            restSrc = afterCmt.trimLeft()
          } else { // block comment not finished in this line
            appendLineResult(restSrc.trimRight())
            restSrc = '' // done with this line
            // transfer to block comment
            currCtx = { scope: EdhSrcScope.Comment, block: true }
          }
          break
        default: // not starting comment
          const [, strDelim, strMore] = <string[]>
            /^("""|'''|```|"|'|`)?(.*)$/[Symbol.match](restSrc)
          if (strDelim) { // start of string literal
            const [strRest, afterStr] = finishStrLit(strMore, strDelim)
            if (null !== afterStr) { // string finished in this line 
              appendLineResult(strDelim + strRest)
              restSrc = afterStr.trimLeft()
            } else { // string not finished in this line
              appendLineResult(restSrc.trimRight())
              restSrc = '' // done with this line
              // transfer to multi-line string
              currCtx = { scope: EdhSrcScope.String, delimiter: strDelim }
            }
          } else { // not starting string
            // extract next contiguous non-space sequence
            const [, seq, moreSrc,] = <string[]>
              /^(\S+)(.*)$/[Symbol.match](restSrc)
            if (lineResult.length > 0) {
              lineResult += ' ' // insert a single space if not a blank line
            }
            let cutOffIdx = seq.length
            for (let i = 0; i < cutOffIdx; i++) {
              const c = seq[i]
              switch (c) {
                // start of string
                case '"':
                case "'":
                case '`':
                  cutOffIdx = i
                  break
                // start of new expr/stmt, break the sequence, so as to 
                // insert a following space
                case ',':
                case ';':
                  lineResult = lineResult.trimRight() + c
                  cutOffIdx = i + 1
                  break
                case '{':
                case '[':
                case '(':
                  bracketStack.push(c)
                  nextIndent += '  ' // increase 1 level (2 spaces) of indent
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case '}':
                  popBracket('{')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0 && !lineResult.endsWith('{')) {
                    lineResult += ' '
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case ']':
                  popBracket('[')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0 && !lineResult.endsWith('[')) {
                    lineResult += ' '
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case ')':
                  popBracket('(')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0 && !lineResult.endsWith('(')) {
                    lineResult += ' '
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                default:
                  lineResult += c
              }
            }
            if (cutOffIdx < seq.length) {
              restSrc = seq.substr(cutOffIdx) + moreSrc
            } else {
              restSrc = moreSrc.trimLeft()
            }
          }
      }

    }

    if (lineIdx >= sinceLine) {
      fmtResult += currIndent + lineResult.trimRight() + '\n'
    }
  }

  if (beforeLine >= document.lineCount) { // formatted to end-of-file
    // exactly 1 blank line at eof
    fmtResult = fmtResult.trimRight() + '\n'
  } else { // not formatted to end-of-file
    if (fmtResult.endsWith('\n\n\n')) { // no more than 2 blank lines at last
      fmtResult = fmtResult.trimRight() + '\n\n\n'
    }
  }
  return [TextEdit.replace(new Range(sinceLine, 0, beforeLine, 0), fmtResult)]
}


enum EdhSrcScope {
  Code, Comment, String,
}

type EdhSrcContext = {
  scope: EdhSrcScope.Code
} | {
  scope: EdhSrcScope.Comment
  block: boolean
} | {
  scope: EdhSrcScope.String
  delimiter: string
}


function finishStrLit(strMore: string, strDelim: string): [string, string | null] {
  let startIdx = 0
  while (true) {
    const endIdx = strMore.indexOf(strDelim, startIdx)
    if (endIdx < 0) {
      return [strMore, null]
    }
    if (endIdx > 0 && '\\' === strMore[endIdx - 1]) {
      // escaped, not realy end of string, continue search
      startIdx = endIdx + 1
    }
    const strClosePos = endIdx + strDelim.length
    return [
      strMore.substring(0, strClosePos),
      strMore.substring(strClosePos)
    ]
  }
}

