# Official Code Formatter for Edh

This extension provides the official code formatter for
[Edh](https://github.com/e-wrks/edh)

- [Format on Save - by default](#format-on-save---by-default)
- [No Configuration](#no-configuration)
- [Enforced Principles](#enforced-principles)
  - [Indent](#indent)
  - [Trailing Spaces](#trailing-spaces)
  - [Number of Blank Lines](#number-of-blank-lines)
  - [Margin Space](#margin-space)
- [Styles Up to You](#styles-up-to-you)
  - [Line Length](#line-length)
  - [Margin between keywords/identifiers and operators](#margin-between-keywordsidentifiers-and-operators)
  - [Margin before an opening bracket](#margin-before-an-opening-bracket)
  - [Semicolons](#semicolons)
  - [Trailing Commas](#trailing-commas)
  - [No more than 2 Blank Lines](#no-more-than-2-blank-lines)

The official formatter is **no-config**, **uncomprised** in some principles,
while **adapting** to the rest of your code style.

## Format on Save - by default

By default it'll format your `.edh` files on save. Use standard **VSCode**
configuration to change this behavior:

```json
  "[edh]": {
    "editor.formatOnSave": false
  }
```

## No Configuration

Don't ask anywhere.

## Enforced Principles

### Indent

> According to only brackets (`{}`/`[]`/`()`)

- Size: **2 spaces**

### Trailing Spaces

- **Never**

> Even in comments and, non-last lines of multi-line strings

### Number of Blank Lines

- At End-Of-File: **exactly 1**
- Everywhere else: **0 ~ 2**

  > Even in comments and multi-line strings

### Margin Space

- Between expressions / statements : **exactly 1**

  > After the `,` and `;` if present

- Inside a pair of brackets (`{}`/`[]`/`()`):

  - Empty Content: **0**
  - With Content: **exactly 1 at each side**

  > Angle brackets `<>` do not exist in **Edh**,
  > they appear as or in operators though

- Outside a pair of brackets:

  - Left side: **0 ~ 1**
    > see [Margin before an opening bracket](#margin-before-an-opening-bracket)
  - Right side as End-of-Line: **0**
  - Right side followed by stuff: **1**

  > Same for both single line and multi-line cases

- Outside a string literal: **1**

## Styles Up to You

### Line Length

> You decide how long each line should run, that means you decide whether to
> split a long line, or merge several short lines

### Margin between keywords/identifiers and operators

> It just can't be more than **1** space, you decide that space to be present
> or not

### Margin before an opening bracket

> It's enforced **no space** before an opening bracket at Start-of-Line, and
> must **1** space if immediately following another closing bracket

> Otherwise, it's up to you to decide whether to put **1** space there

### Semicolons

Neither the formatter nor the interpreter of **Edh** will insert semicolons
for you, most places don't need one, and harmless to have one there, but you
do at chances need to insert ones yourself, for disambiguation purpose

### Trailing Commas

Trailing commas are permited by the language syntax to greatest extent, but
it's up to you to write ones here and there

### No more than 2 Blank Lines

You can put blank lines anywhere so long as no more than **2** adjacent ones
of them

Um, plus it has to be **1** and only **1** at EoF
