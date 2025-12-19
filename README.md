# Napi-MeCab

A Node-API wrapper for the MeCab library. The MeCab engine's source code can be found [here (Original/Japanese)](src/napi-mecab-jp/), and [here (Korean)](src/napi-mecab-ko/). It has been patched for more idiomatic usage with Node.js and usage on Windows.

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

## Third-Party Software

This project includes and/or has been tested with source code from the following third-party software, used under the BSD License:

- **MeCab** - Copyright (c) 2001-2008 Taku Kudo and Nippon Telegraph and Telephone Corporation
- **MeCab-Ko** - Korean language port of MeCab
- **UniDic** - Copyright (c) 2023 National Institute for Japanese Language and Linguistics

Full license texts can be found in the [tp-licenses](tp-licenses/) directory.

## Installation

```bash
npm install napi-mecab
```

After installing the package, you'll need to run an additional setup script. This setup script will download the precompiled Node-API binary as well as the dictionary for each of the languages you ask for.

#### Setup Script Usage

```bash
npx napi-mecab-setup [...languageCodes]
```

Detailed script usage can be found at [napi-mecab-setup](https://www.npmjs.com/package/napi-mecab-setup).

## Compiling from Source

Instead of using the setup script, you can also compile the binary from source. Your environment will need Python and build tools installed (see [node-gyp installation requirements](https://github.com/nodejs/node-gyp#installation)).

> Note: You will still need to separately download or compile your own dictionaries for use with MeCab/MeCab-Ko. See the [Dictionaries](#dictionaries) section for details.

```bash
cd node_modules/napi-mecab
npx node-gyp build # or rebuild, if needed
```

## Dictionaries

This library uses [UniDic](https://clrd.ninjal.ac.jp/unidic/en/) for its Japanese dictionary, and the [mecab-ko-dic](https://bitbucket.org/eunjeon/mecab-ko-dic/src/master/) for its Korean dictionary.

Precompiled Japanese and Korean dictionaries exist in [napi-mecab-setup releases](https://github.com/jacoblockett/napi-mecab-setup/releases). If you choose to skip the [setup script](#script-usage) and compile a dictionary yourself, you will need some form of `make` to do so. If you have no idea what that means, either visit [this link](https://makefiletutorial.com/) or use the precompiled assets via the [setup script](#script-usage) to keep things simple on yourself.

This package is configured to work first-class with Japanese and Korean using compiled dictionaries under the following paths:

```bash
node_modules/napi-mecab/dict/jp-dict # Japanese dictionary
node_modules/napi-mecab/dict/ko-dict # Korean dictionary
```

When dictionaries exist under these paths, this library will automatically assign the correct MeCab engine to use for each dictionary.

You can also provide your own dictionary to use and pass the path to the `MeCab` class, specifying which engine to use as well (see: [API Reference](#api-reference)). However, unless you're using your own modified Japanese/Korean dictionaries that are guaranteed to work with MeCab/MeCab-Ko (and specifically this library's interpretation wrapper), I highly recommend just using the dictionaries found in [napi-mecab-setup releases](https://github.com/jacoblockett/napi-mecab-setup/releases).

## Usage

```js
import MeCab from "napi-mecab"
// cjs is also supported, i.e.
// const MeCab = require("napi-mecab")

const text = "아버지가방에들어가신다"
const parser = new MeCab({ engine: "ko" })
const parsed = parser.parse(text)

parsed.forEach(t => console.log(t.surface))
```

```bash
>node index.js
아버지
가
방
에
들어가
신다
```

## API Reference

### Class :: `MeCab`

A high-level wrapper to load the MeCab engine using a dictionary driver of your choice.

### Signature:

```ts
class MeCab {
	constructor(config: { engine: "jp" | "ko"; dictPath: string })

	parse(text: string): Token[]
}
```

### Constructor :: `new MeCab(opts)`

Creates a MeCab engine class that can parse specific text.

#### Parameters:

| Name             | Default       | Type     | Description                                                                                                                       |
| ---------------- | ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `opts?`          |               | `object` | Options for the instance.                                                                                                         |
| `opts.engine?`   | `"jp"`        | `string` | The language engine to use. The engine must match one of the expected values for the [supported languages](#supported-languages). |
| `opts.dictPath?` | internal path | `string` | The absolute path to the directory of the compiled dictionary you plan to use with MeCab.                                         |

#### Supported Languages:

| Expected Value | Language |
| -------------- | -------- |
| `"jp"`         | Japanese |
| `"ko"`         | Korean   |

### Method :: `MeCab.prototype.parse(text: string): Token[]`

Parses the given text into an array of tokens.

#### Parameters:

| Name   | Type     | Description        |
| ------ | -------- | ------------------ |
| `text` | `string` | The text to parse. |

#### Returns:

`Token[]`

### Class :: `Token`

A structure representing parsed data provided by MeCab.

> 🚫 You're not meant to construct this class directly. This is purely for getter documentation.

### Signature:

```ts
class Token {
	constructor(engine: "jp" | "ko", raw: string)

	get conjugationForm: string | null
	get conjugationType: string | null
	get expression: ExpressionToken[] | null
	get features: string
	get grammaticalRole: string | null
	get hasBatchim: boolean | null
	get hasJongseong: boolean | null
	get lemma: string | null
	get lemmaKana: string | null
	get lemmaPronunciation: string | null
	get origin: string | null
	get pitch: string | null
	get pos: string[]
	get pronunciation: string | null
	get raw: string
	get semanticClass: string | null
	get surface: string
	get type: string | null
}
```

### Constructor :: `new Token(engine, raw)`

A structure representing parsed data provided by MeCab.

#### Parameters:

| Name     | Type         | Description                                  |
| -------- | ------------ | -------------------------------------------- |
| `engine` | `"jp"\|"ko"` | The language engine used to parse the token  |
| `raw`    | `string`     | The raw surface and feature set of the token |

### Getters:

| Key                | Type                        | Supported Language | Description                                                                                        |
| ------------------ | --------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| conjugationForm    | `string \| null`            | jp                 | The form of conjugation being used on the word, e.g. present tense, continuative form, etc.        |
| conjugationType    | `string \| null`            | jp                 | The conjugation type, e.g. regular, irregular, etc.                                                |
| expression         | `ExpressionToken[] \| null` | ko                 | The broken-down details of how the token is formed.                                                |
| features           | `string`                    | jp, ko             | The raw features string returned by the underlying MeCab engine.                                   |
| grammaticalRole    | `string \| null`            | jp                 | The grammatical role this token's form serves within the sentence.                                 |
| hasBatchim         | `boolean \| null`           | ko                 | Whether the token has a final consonant or not.                                                    |
| hasJongseong       | `boolean \| null`           | ko                 | Whether the token has a final consonant or not.                                                    |
| lemma              | `string \| null`            | jp, ko             | The actual dictionary headword as the token would appear in a dictionary.                          |
| lemmaKana          | `string \| null`            | jp                 | The orthographic kana spelling of the dictionary form of the token, as you would see in textbooks. |
| lemmaPronunciation | `string \| null`            | jp                 | The natural pronunciation of the dictionary form of the token.                                     |
| origin             | `string \| null`            | jp                 | The origin of the word.                                                                            |
| pitch              | `string \| null`            | jp                 | The pitch accent information indicating where pitch rises/falls in the token.                      |
| pos                | `string[]`                  | jp, ko             | The parts of speech that make up this token.                                                       |
| pronunciation      | `string \| null`            | jp, ko             | How the token, as written, is pronounced.                                                          |
| raw                | `string`                    | jp, ko             | The raw string returned by the underlying MeCab engine.                                            |
| semanticClass      | `string \| null`            | ko                 | The semantic word class or category this token belongs to.                                         |
| surface            | `string`                    | jp, ko             | How the token looks in the input text you provided.                                                |
| type               | `string \| null`            | ko                 | The type of token this token is, e.g. inflection, compound noun, etc.                              |

> 💡 Getters that return `null` do so when the feature doesn't apply to that token or when using a language driver that doesn't support that feature.

### Class :: `ExpressionToken`

An expression piece of a larger expression whole that details the individual tokens that make up an agglutinated token. (**Korean only**)

> 🚫 You're not meant to construct this class directly. This is purely for getter documentation.

### Signature:

```ts
class ExpressionToken {
	constructor(raw: string)

	get morpheme: string
	get pos: string
	get semanticClass: string | null
}
```

### Constructor :: `new Token(engine, raw)`

An expression piece of a larger expression whole that details the individual tokens that make up an agglutinated token.

#### Parameters:

| Name  | Type     | Description               |
| ----- | -------- | ------------------------- |
| `raw` | `string` | The raw expression string |

### Getters:

| Key           | Type             | Description                                                |
| ------------- | ---------------- | ---------------------------------------------------------- |
| morpheme      | `string`         | The normalized token.                                      |
| pos           | `string`         | The part of speech of the token.                           |
| semanticClass | `string \| null` | The semantic word class or category this token belongs to. |

> 💡 Getters that return `null` do so when the feature doesn't apply to that token.
