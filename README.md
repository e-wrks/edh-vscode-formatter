# Official Code Formatter for Đ (Edh)

This extension provides the official code formatter for
[Đ (Edh)](https://github.com/e-wrks/edh)

The official formatter is **no-config**, **uncomprised** in some principles,
while **adapting** to the rest of your code style.

- [Format on Save - by default](#format-on-save---by-default)
- [No Configuration](#no-configuration)
- [Enforced Principles](#enforced-principles)
  - [Indention](#indention)
  - [Trailing Space](#trailing-space)
  - [Adjacent Blank Lines](#adjacent-blank-lines)
  - [Margin Space](#margin-space)
- [Styles Up to You](#styles-up-to-you)
  - [Line Length](#line-length)
  - [Semicolons](#semicolons)
  - [Commas](#commas)
    - [Trailing Commas](#trailing-commas)
  - [String Quotes](#string-quotes)
  - [Margins](#margins)
    - [between keywords/identifiers and operators](#between-keywordsidentifiers-and-operators)
    - [before an opening bracket](#before-an-opening-bracket)
  - [Blank Lines](#blank-lines)

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

### Indention

- Size:

  **2 spaces**

- Placement

  Only with nesting of brackets (`{}`/`[]`/`()`).

That's to say, lines within nested brackets are always further indented,
each nesting level add exactly 2 spaces to the indention; and without an
enclosing bracket, a line is kept at same indention level of the line
above. For example:

```edh
method abs( x )
  if x < 0 then
    return -x
  else
    return x
```

will be formatted to

```edh
method abs( x )
if x < 0 then
return -x
else
return x
```

It's not wrong semantically, but idiomatically you are adviced to write it
like this:

```edh
method abs( x ) {
  if x < 0
  then return -x
  else return x
}
```

Or this:

```edh
method abs( x ) if x < 0 then -x else x
```

Or this:

```edh
method abs( x ) x < 0 &> ( -x ) |> x
```

While

```edh
for x from [ 3, 2, 5 ] do
  for y from [ 7, 9, 10 ] do
    yield x * y
```

will be formatted to:

```edh
for x from [ 3, 2, 5 ] do
for y from [ 7, 9, 10 ] do
yield x * y
```

which is actually idiomatic **Edh** style, and also:

```edh
generator long'long'arg'list (
  a, b, c, d, e, f
) {
  for x from [ 3, 2, 5 ] do
  for y from [ 7, 9, 10 ] do
  yield pkargs( x, y )
}

for ( x, y )
from long'long'arg'list( 1, 2, 3, 4, 5, 6 )
do { use'x( x ) use'y( y ) }
```

### Trailing Space

**Never** on a line

> Even in comments and multi-line strings

> For literal strings to have trailing spaces, write each such line separately,
> concatenate them then, e.g.

```edh
str'with'trailing'spaces = `first line  \n`
++ `middle lines
without trailing space
a line needs trailing space  \n`
++ `rest lines
without trailing space
last line can have trailing spaces  `
```

### Adjacent Blank Lines

- At End-Of-File:

  **exactly 1**

- Everywhere else:

  **0 ~ 2**

  > Even in comments and multi-line strings

### Margin Space

- Between expressions/statements:

  **exactly 1**

  > After the comma (`,`) / semicolon (`;`) if present

- Inside a pair of brackets (`{}`/`[]`/`()`):

  > Note angle brackets `<>` do not exist in **Edh**, they appear as or in
  > operators though.

  - Without Content:

    **0**

  - With Content:

    **exactly 1 at each side**

  > Note **Edh** brackets are extensible by sticking operator chars to both or
  > either of the opening/closing tag, currently there is

  ```edh
  {$ ... $}
  ```

  > for expression iterpolation, and there shall be more in the future.

  > The formatter will format

  ```edh
  some'proc(**kwargs)
  ```

  > to

  ```edh
  some'proc(** kwargs )
  ```

  > as it thinks there is a `(** )` bracket pair instead of `()`, this is less
  > ideal, though the interpreter will still work as expected so far, before
  > some extended bracket e.g.

  ```edh
  (* ... *)
  ```

  > get introduced by the language syntax.

  > You can write

  ```edh
  some'proc( **kwargs)
  ```

  > so the formatter can understand it
  > mentally correct and format the code to

  ```edh
  some'proc( **kwargs )
  ```

  > . And the
  > formatter will accept spaces between `**` and `kwargs` too, i.e.

  ```edh
  some'proc( ** kwargs )
  ```

- Outside a pair of brackets:

  - Left side:

    **0 ~ 1**

    > see [before an opening bracket](#before-an-opening-bracket)

  - Right side as End-of-Line:

    **0**

    > as it is effectivelly [Trailing Space](#trailing-space)

  - Right side followed by stuff:

    **1**

  > Same for both single line and multi-line cases

- Outside a string literal:

  **1**

## Styles Up to You

### Line Length

You decide how long each line should run, that means whether to split a long
line, or to join several short lines.

### Semicolons

Unlike **JavaScript**, neither the formatter nor the interpreter of **Edh**
will insert semicolons for you.

But like **ECMAScript 6**, in most places a semicolon is not necessary, you
just start writing the next expression or statement, while it's also harmless
to write a semicolon as separator.

Well there're cases semicolons are necessary for disambiguation purpose.

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

Rules of thumb:

> Prefix a semicolon (`;`) to one of these expressions if it's not the first
> expression in its scope:

- Tuple literal - to be disambiguated from procedure call
  ```edh
  ; ( a, b, c )
  ```
- List literal - to be disambiguated from indexing
  ```edh
  ; [ a, b, c ]
  ```
- Negation - to be disambiguated from subtraction
  ```edh
  ; -inf -> ...
  ```
- Guard - to be disambiguated from binary infix operator `|`
  ```edh
  ; | null( l ) -> ...
  ```

> Actually you'd prefer to always add that semicolon even if it's the first
> expression, to save some trouble when later someone else or yourself to
> put more expressions/statements before it.

### Commas

It may be a little surprising, but commas can be omitted in **Edh**

```bash
Đ: type( (3 2 1) )
TupleType
Đ: type( [3 2 1] )
ListType
Đ: let (a b c) = (3 2 1)
Đ: (a b c) == ( a, b, c, )
true
Đ: [a b c] ~= [ a, b, c, ]
true
Đ: (a b c)
( 3, 2, 1, )
Đ: console.print(a b c)
3
2
1
Đ: console.print( a, b, c, )
3
2
1
Đ:
```

The formatter wont' insert commas for you, and neither will it remove any.

> We'll figure out what a linter should say regarding commas in your code.

#### Trailing Commas

Trailing commas are permited by the language syntax to greatest extent, but
it's up to you to write ones here and there, the formatter won't add or
remove commas anyway.

### String Quotes

There're actually **6** quotation marks for string literals in **Edh**, i.e.
double quote (`"`), single quote (`'`), backtick (`) and the triple forms
of them. All support multi-line contents.

The formatter won't queston your choice.

> Neither should an **Edh** linter do that, for one to come sooner or later.

### Margins

#### between keywords/identifiers and operators

It just can't be more than **1** space, you decide that 1 space to be present
or not.

For example, all these forms will be kept intact:

```edh
s = s ++ '.edh'
s =s ++ '.edh'
s= s ++ '.edh'
s=s++ '.edh'
```

While excessive white spaces will be thrown away by the formatter.

> Note **1** space before a string literal is always maintained as shown above.

#### before an opening bracket

There're curly/square/round brackets in **Edh**, i.e. (`{}`/`[]`/`()`) .

It's enforced **no space** before an opening bracket at **Start-of-Line**, and
must **1** space if immediately following another closing bracket.

Otherwise, typically in a procedure call expression, it's up to you to
decide whether to put a space between the procedure name and the opening
round bracket. That's to say, all of the following will be kept intact:

```edh
some'proc()
some'proc ()
some'array[ i ]
some'array [ i ]
if errno<0 then{ rethrow }
if errno < 0 then { rethrow }
```

### Blank Lines

You can put blank lines anywhere so long as no more than **2** adjacent ones
of them.

Um, plus there has to be exactly **1** blank line at EoF.
