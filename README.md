# Official Code Formatter for Edh

This extension provides the official code formatter for
[Edh](https://github.com/e-wrks/edh)

- [Format on Save - by default](#format-on-save---by-default)
- [No Configuration](#no-configuration)
- [Enforced Principles](#enforced-principles)
  - [Indent](#indent)
  - [Trailing Spaces](#trailing-spaces)
  - [Max Number of Blank Lines](#max-number-of-blank-lines)
  - [Margin Space](#margin-space)
- [Styles Up to You](#styles-up-to-you)
  - [Line Length](#line-length)
  - [Semicolons](#semicolons)
  - [Trailing Commas](#trailing-commas)
  - [String Quotes](#string-quotes)
  - [Margin between keywords/identifiers and operators](#margin-between-keywordsidentifiers-and-operators)
  - [Margin before an opening bracket](#margin-before-an-opening-bracket)
  - [Blank Lines](#blank-lines)

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

### Max Number of Blank Lines

- At End-Of-File: **exactly 1**
- Everywhere else: **0 ~ 2**

  > Even in comments and multi-line strings

### Margin Space

- Between expressions / statements : **exactly 1**

  > After the comma (`,`) and semicolon (`;`) if present

- Inside a pair of brackets (`{}`/`[]`/`()`):

  > Note angle brackets `<>` do not exist in **Edh**, they appear as or in
  > operators though.

  - Empty Content: **0**
  - With Content: **exactly 1 at each side**

  > Note **Edh** brackets are extensible by sticking operator chars to both or
  > either of the opening/closing tag, currently there is `{$ ... $}` for
  > expression iterpolation, and shall be more in the future.

  > The formatter will format `some'proc(**kwargs)` to `some'proc(** kwargs )`
  > as it thinks there is a `(** )` bracket pair instead of `()`, this is less
  > ideal, though the interpreter will still work as expected so far, before
  > some extended bracket e.g. `(* ... *)` get introduced by the language
  > syntax.

  > You can write `some'proc( **kwargs)` so the formatter can understand it
  > mentally correct and format the code to `some'proc( **kwargs )` . And the
  > formatter will accept spaces between `**` and `kwargs` too, i.e.
  > `some'proc( ** kwargs )` .

- Outside a pair of brackets:

  - Left side: **0 ~ 1**
    > see [Margin before an opening bracket](#margin-before-an-opening-bracket)
  - Right side as End-of-Line: **0**
  - Right side followed by stuff: **1**

  > Same for both single line and multi-line cases

- Outside a string literal: **1**

## Styles Up to You

### Line Length

You decide how long each line should run, that means you decide whether to
split a long line, or merge several short lines.

### Semicolons

Unlike **JavaScript**, neither the formatter nor the interpreter of **Edh**
will insert semicolons for you.

In most places a semicolon is not needed, you just start writing the next
expression or statement, while it's also harmless to write a semicolon as
separator. But there're cases semicolons are necessary for disambiguation
purpose.

For example:

```bash
Đ: {
Đ|  1:   l = [('a', 2),  ('b', 5)]
Đ|  2:   x = 3
Đ|  3:   ('x', x) => l
Đ|  4:   console.print(l)
Đ|  5: }
❗ /edh_modules/repl/__main__.edh:31:5
Recovered from error: 💔
📜 module:/edh_modules/repl 🔎 /edh_modules/repl/__main__.edh:1:1 👈 <genesis>:1:1
📜 module:/edh_modules/repl 🔎 /edh_modules/repl/__main__.edh:1:1 👈 <genesis>:1:1
👉 <console>:2:3
💣 Can not call a DecimalType: 3
Your last input may have no effect due to the error.
Đ:
```

You actually should write:

```edh
{
  l = [('a', 2),  ('b', 5)]
  x = 3
  ; ('x', x) => l
  console.print(l)
}
```

to get

```bash
Đ: {
Đ|  1:   l = [('a', 2),  ('b', 5)]
Đ|  2:   x = 3
Đ|  3:   ; ('x', x) => l
Đ|  4:   console.print(l)
Đ|  5: }
[ ( "x", 3, ), ( "a", 2, ), ( "b", 5, ), ]
Đ:
```

Rules of thumb: prefix a semicolon (`;`) to one of these expressions if it's
not the first expression in its scope:

- Tuple literal - to be disambiguated from procedure call
  > `; ( a, b, c )`
- List literal - to be disambiguated from indexing
  > `; [ a, b, c ]`
- Negation - to be disambiguated from subtraction
  > `; -inf -> ...`
- Guard - to be disambiguated from binary infix operator `|`
  > `; | null( l ) -> ...`

> Actually you'd prefer to always add that semicolon even if it's the first
> expression, to save some trouble when later someone else or yourself to
> put more expressions/statements before it.

### Trailing Commas

Trailing commas are permited by the language syntax to greatest extent, but
it's up to you to write ones here and there, the formatter won't add or
remove commas.

### String Quotes

There're actually **6** quotation marks for string literals in **Edh**, i.e.
double quote (`"`), single quote (`'`), backtick (`) and the triple forms
of them. All support multi-line contents.

The formatter won't queston your choice.

> Neither should an **Edh** linter, for one to come sooner or later.

### Margin between keywords/identifiers and operators

It just can't be more than **1** space, you decide that 1 space to be present
or not.

For example, all these forms will be kept intact:

- `s = s ++ '.edh'`
- `s =s ++ '.edh'`
- `s= s ++ '.edh'`
- `s=s++ '.edh'`

While excessive white spaces will be thrown away by the formatter.

> Note **1** space before a string literal is always maintained as shown above.

### Margin before an opening bracket

There're curly/square/round brackets in **Edh**, i.e. (`{}`/`[]`/`()`) .

It's enforced **no space** before an opening bracket at **Start-of-Line**, and
must **1** space if immediately following another closing bracket.

Otherwise, typically in a procedure call expression, it's up to you to
decide whether to put a space between the procedure name and the opening `(`.
That's to say, all of the following will be kept intact:

```
some'proc()
some'proc ()
some'array[ i ]
some'array [ i ]
if errno<0 then{ rethrow }
if errno<0 then { rethrow }
```

### Blank Lines

You can put blank lines anywhere so long as no more than **2** adjacent ones
of them.

Um, plus it has to be **1** and only **1** at EoF.
