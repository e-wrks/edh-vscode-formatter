
import { TextDocument, Range, TextEdit, ProviderResult } from 'vscode'


// TODO support more Unicode ranges as valid identifier chars
const identStartChars = /[_a-zA-Z]/
const identChars = /[_a-zA-Z0-9']/

const opChars = "=~!@#$%^&|:<>?+-*/";


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
    let lexemeOnline = false

    function appendLexeme(lexemeHead: string): void {
      if (lexemeOnline) { // after some lexeme, insert a space
        lineResult += ' '
      }
      lineResult += lexemeHead
      lexemeOnline = true
    }

    const [lineIndent, lineSrc] = (() => {
      if (EdhSrcScope.String === currCtx.scope) {
        const [strRest, afterStr] = finishStrLit(line, currCtx.delimiter)
        if (null === afterStr) { // string not finished in this line
          if (lineIdx >= sinceLine) {
            fmtResult += line.trimRight() + '\n'
          }
          return [null, null];
        }
        // string finished in this line
        currIndent = ''
        lineResult = strRest

        // as if no lexeme ever on this line, so as to disable space
        // insertion in case no original space following the end of this
        lexemeOnline = false // string

        // trnasfer to code
        currCtx = { scope: EdhSrcScope.Code }
        return ['', afterStr]
      } else {
        const [, lineIndent, lineSrc,] = <string[]> // it's guaranteed to match
          /^(\s*)(.*)$/[Symbol.match](line)
        return [lineIndent, lineSrc];
      }
    })();
    if (null === lineIndent) {
      continue; // line already consumed
    }

    if (!lineSrc) {
      if (lineResult) { // a fully consumed, non-blank line
        if (lineIdx >= sinceLine) {
          fmtResult += currIndent + lineResult.trimRight() + '\n'
        }
      } else { // a blank line
        if (lineIdx < sinceLine) { // not to be changed
          blankLineCnt++
        } else {
          if (blankLineCnt < 2) { // not too many of blank lines
            fmtResult += '\n' // one more blank line
            blankLineCnt++
          }
        }
      }
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
        // check any valid code on current line
        const codeOnLine = (() => {
          const nonCodeChars = " \t}])" + opChars
          for (const c of lineResult.trim()) {
            if (nonCodeChars.indexOf(c) < 0) {
              return true
            }
          }
          return false
        })()
        if (!codeOnLine) {
          // only (possibly augmented) closing brackets on this line,
          // outdent since this line
          currIndent = nextIndent
        }
      }
    }

    let restSrc = lineSrc.trimLeft()
    let spcLeading = restSrc.length < lineSrc.length
    while (restSrc) {

      if (EdhSrcScope.Comment === currCtx.scope) {
        const cmtCloseIdx = restSrc.indexOf('#}')
        if (cmtCloseIdx < 0) { // still in comment block
          const cmtLine = restSrc.trim()
          if (cmtLine.startsWith('#')) {
            // make it aligned with the initial `{#`
            lineResult = ' ' + cmtLine
          } else {
            // keep however this line is indented
            currIndent = ''
            lineResult = line
          }
          restSrc = '' // done with this line
        } else { // block comment finished in this line
          const cmtContent = restSrc.substring(0, cmtCloseIdx + 2).trimLeft()
          appendLexeme(' ' + cmtContent)
          restSrc = restSrc.substring(cmtCloseIdx + 2).trimLeft()
          spcLeading = true // as if there is space following end of block cmt
          // trnasfer to code
          currCtx = { scope: EdhSrcScope.Code }
        }
        continue
      }

      const [, cmtTag, cmtRest] = <string[]>
        /^({#|#)?(.*)$/[Symbol.match](restSrc)
      switch (cmtTag) {
        case '#': // line comment
          appendLexeme(restSrc.trimRight())
          restSrc = '' // done with this line
          break
        case '{#': // start of block comment
          const [, cmtContent, cmtClose, afterCmt] = <string[]>
            /^(.*)(#})?(.*)$/[Symbol.match](cmtRest)
          if ('#}' === cmtClose) { // block comment finished in this line
            appendLexeme('{#' + cmtContent + '#}')
            restSrc = afterCmt.trimLeft()
            spcLeading = true // as if there is space following end of block cmt
          } else { // block comment not finished in this line
            appendLexeme(restSrc.trimRight())
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
              // insert space before the string, iif it originally
              if (spcLeading) { lineResult += ' ' } // has leading space
              lineResult += strDelim + strRest
              // as if no lexeme ever on this line, so as to disable space
              // insertion in case no original space following the end of this
              lexemeOnline = false // string

              const moreAfter = afterStr.trimLeft()
              restSrc = moreAfter
              spcLeading = moreAfter.length < afterStr.length
            } else { // string not finished in this line
              // insert space before the string, iif it originally
              if (spcLeading) { lineResult += ' ' } // has leading space
              lineResult += restSrc.trimRight()

              restSrc = '' // done with this line
              // transfer to multi-line string
              currCtx = { scope: EdhSrcScope.String, delimiter: strDelim }
            }
          } else { // not starting string
            // extract next contiguous non-space sequence
            const [, seq, moreSrc,] = <string[]>
              /^(\S+)(.*)$/[Symbol.match](restSrc)
            if (spcLeading && lineResult.length > 0) {
              // collapse leading spaces into a single space
              lineResult += ' '
            } else if (lexemeOnline) { // no original space, but having some
              // lexeme already on this line, insert a single space before the
              // lexeme just appeared
              lineResult += ' '
            }
            lexemeOnline = true
            let cutOffIdx = seq.length
            let inIdent = false
            for (let i = 0; i < cutOffIdx; i++) {
              const c = seq[i]
              if (inIdent) {
                if (!identChars.test(c)) {
                  inIdent = false
                }
              } else if (identStartChars.test(c)) {
                inIdent = true
              }
              switch (c) {
                // start of string
                case "'":
                  if (inIdent) {
                    // special treatment for the single quote possibly appears 
                    // within an identifier - it's part of the identifier, not
                    // a string start
                    lineResult += c
                    break
                  }
                case '"':
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
                  for (i++; i < cutOffIdx; i++) {
                    const c1 = seq[i]
                    if (opChars.indexOf(c1) < 0) { break }
                    lineResult += c1
                  }
                  cutOffIdx = i // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case '}':
                  popBracket('{')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0) {
                    const c1 = lineResult[lineResult.length - 1]
                    if ('{' !== c1 && opChars.indexOf(c1) < 0) {
                      lineResult += ' '
                    }
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case ']':
                  popBracket('[')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0) {
                    const c1 = lineResult[lineResult.length - 1]
                    if ('[' !== c1 && opChars.indexOf(c1) < 0) {
                      lineResult += ' '
                    }
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                case ')':
                  popBracket('(')
                  lineResult = lineResult.trimRight()
                  if (lineResult.length > 0) {
                    const c1 = lineResult[lineResult.length - 1]
                    if ('(' !== c1 && opChars.indexOf(c1) < 0) {
                      lineResult += ' '
                    }
                  }
                  lineResult += c
                  cutOffIdx = i + 1 // start of new expr/stmt, break the
                  // sequence, so as to insert a following space
                  break
                default:
                  lineResult += c
              }
            }
            const moreAfter = cutOffIdx < seq.length
              ? seq.substr(cutOffIdx) + moreSrc
              : moreSrc;
            restSrc = moreAfter.trimLeft()
            spcLeading = restSrc.length < moreAfter.length
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

