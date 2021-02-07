
import { TextDocument, Range, TextEdit, ProviderResult } from 'vscode'


/**
 * align with Haskell interpreter

isIdentStart :: Char -> Bool
isIdentStart !c = c == '_' || Char.isAlpha c

isIdentChar :: Char -> Bool
isIdentChar c = c == '_' || c == '\'' || Char.isAlphaNum c

 */
const identStartChars = /(_|\p{L})/u
const identChars = /([_']|\p{L}|\p{N})/u


/**
 * align with Haskell interpreter

isOperatorChar :: Char -> Bool
isOperatorChar c = if c < toEnum 128
  then elem c ("=~!@#$%^&|:<>?*+-/" :: [Char])
  else case Char.generalCategory c of
    Char.MathSymbol           -> True
    Char.CurrencySymbol       -> True
    Char.ModifierSymbol       -> True
    Char.OtherSymbol          -> True

    Char.DashPunctuation      -> True
    Char.OtherPunctuation     -> True

    _                         -> False
 */
function isOperatorChar(c: string): boolean {
  if (c <= '\xff') {
    return "=~!@#$%^&|:<>?*+-/".indexOf(c) >= 0
  } else {
    return /(\p{Sm}|\p{Sc}|\p{Sk}|\p{So}|\p{Pd}|\p{Po})/u.test(c)
  }
}

/**
 * align with Haskell interpreter

  isMagicChar :: Char -> Bool
  isMagicChar c = elem c (".[]" :: [Char]) || isOperatorChar c

 */
function isMagicChar(c: string): boolean {
  if (".[]".indexOf(c) >= 0) {
    return true
  } else {
    return isOperatorChar(c)
  }
}


function containsCode(line: string): boolean {
  // these would matche some general category in opChars
  if (/[_'"`]/g.test(line)) { return true }
  // TODO exact isOperatorChar() equivalent impl.?
  const opChars = /([=~!@#$%^&|:<>?*+-/]|\p{Sm}|\p{Sc}|\p{Sk}|\p{So}|\p{Pd}|\p{Po})/gu
  // see what's left after non-code chars removed
  const withNonCodeRemoved = line
    .replace(/\s|[)\]}]/g, '')
    .replace(opChars, '')
  return !!withNonCodeRemoved
}


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

        // partial string in this line is considered a lexeme
        lexemeOnline = true

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
        if (!containsCode(lineResult)) {
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
          lineResult += ' ' + cmtContent
          lexemeOnline = true
          const afterCmt = restSrc.substring(cmtCloseIdx + 2)
          restSrc = afterCmt.trimLeft()
          spcLeading = restSrc.length < afterCmt.length
          // trnasfer to code
          currCtx = { scope: EdhSrcScope.Code }
        }
        continue
      }

      const [, cmtTag, cmtRest] = <string[]>
        /^({#|#)?(.*)$/[Symbol.match](restSrc)
      switch (cmtTag) {
        case '#': // line comment
          if (lexemeOnline) {
            lineResult += ' '
          }
          lineResult += restSrc.trimRight()
          restSrc = '' // done with this line
          break
        case '{#': // start of block comment
          const singleLine = /^(.*)(#})(.*)$/[Symbol.match](cmtRest)
          if (singleLine) { // block comment finished in this line
            const [, cmtContent, _, afterCmt] = <string[]>singleLine
            if (lexemeOnline) {
              lineResult += ' '
            }
            lineResult += '{#' + cmtContent + '#}'
            lexemeOnline = true
            restSrc = afterCmt.trimLeft()
            spcLeading = restSrc.length < afterCmt.length
          } else { // block comment not finished in this line
            lineResult += restSrc.trimRight()
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
              if (spcLeading) {  // has original leading space
                lineResult += ' '
              } else if (lineResult.length > 0) {
                if (',;{[()]}'.indexOf(lineResult[lineResult.length - 1]) >= 0) {
                  // no original space, but following comma, semicolon, bracket
                  // insert a single space
                  lineResult += ' '
                }
              }
              lineResult += strDelim + strRest

              // string in this line is considered a lexeme
              lexemeOnline = true

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
            if (lexemeOnline && spcLeading) {
              // collapse leading spaces into a single space
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
                  if (i + 1 < cutOffIdx) {
                    const nc = seq[i + 1]
                    if (nc === '#') { // start of block comment
                      const cmtRest = seq.substr(i + 2) + moreSrc
                      const singleLine = /^(.*)(#})(.*)$/[Symbol.match](cmtRest)
                      if (singleLine) { // block comment finished in this line
                        const [, cmtContent, _, afterCmt] = <string[]>singleLine
                        if (lexemeOnline) {
                          lineResult += ' '
                        }
                        lineResult += '{#' + cmtContent + '#}'
                        lexemeOnline = true
                        // mark that more have been consumed
                        cutOffIdx = seq.length + 1
                        restSrc = afterCmt.trimLeft()
                        spcLeading = restSrc.length < afterCmt.length
                      } else { // block comment not finished in this line
                        const cmtStart = seq.substr(i) + moreSrc
                        lineResult += cmtStart.trimRight()
                        // mark that more have been consumed
                        cutOffIdx = seq.length + 1
                        restSrc = '' // done with this whole line
                        // transfer to block comment
                        currCtx = { scope: EdhSrcScope.Comment, block: true }
                      }
                      break
                    }
                  }
                case '[':
                  bracketStack.push(c)
                  nextIndent += '  ' // increase 1 level (2 spaces) of indent
                  lineResult += c
                  for (i++; i < cutOffIdx; i++) {
                    const c1 = seq[i]
                    if (!isOperatorChar(c1)) { break }
                    lineResult += c1
                  }
                  cutOffIdx = i // start new expr/stmt
                  break
                case '(':
                  bracketStack.push(c)
                  nextIndent += '  ' // increase 1 level (2 spaces) of indent
                  lineResult += c
                  for (i++; i < cutOffIdx; i++) {
                    const c1 = seq[i]
                    if (!isMagicChar(c1)) { break }
                    lineResult += c1
                  }
                  cutOffIdx = i // start new expr/stmt
                  break
                case '}':
                  popBracket('{')
                  lineResult += c
                  cutOffIdx = i + 1 // start as new expr/stmt
                  break
                case ']':
                  popBracket('[')
                  lineResult += c
                  cutOffIdx = i + 1 // start as new expr/stmt
                  break
                case ')':
                  popBracket('(')
                  lineResult += c
                  cutOffIdx = i + 1 // start as new expr/stmt
                  break
                default:
                  lineResult += c
              }
            }
            if (cutOffIdx > seq.length) {
              // restSrc and spcLeading should have been set properly
            } else {
              const moreAfter = cutOffIdx < seq.length
                ? seq.substr(cutOffIdx) + moreSrc
                : moreSrc;
              restSrc = moreAfter.trimLeft()
              spcLeading = restSrc.length < moreAfter.length
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

