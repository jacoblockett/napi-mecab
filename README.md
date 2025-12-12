# MeCab

A Node-API wrapper for the MeCab library. The MeCab engine's source code can be found [here (Original/Japanese)](src/mecab-jp/), and [here (Korean)](src/mecab-ko/). It has been patched for more idiomatic usage with Node.js and usage on Windows.

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
pnpm i mecab
```

After installing the package, you'll need to run the included post-install script. This post install script will download the precompiled Node-API binary as well as the dictionary for each of the languages you ask for.

#### Script Usage

```bash
script [-l, --lang LANG]

# Examples
script          # installs all languages
script -l jp,ko # installs japanese and korean dictionaries
script -l ru    # throws an error as russion is not supported
```

> ❔ Be sure to choose the correct one for your environment.

```bash
# Windows 64-bit
./node_modules/mecab/scripts/install-windows-amd64.exe

# macOS Apple Silicon (ARM64)
./node_modules/mecab/scripts/install-darwin-arm64

# Linux 64-bit
./node_modules/mecab/scripts/install-linux-amd64
```

## Compiling from Source

Instead of using the included post-install script, you can also compile the binary from source. Your environment will need to support the use of `node-gyp` for this to work.

```bash
cd node_modules/mecab
npx node-gyp build # or rebuild, if needed
```

#### Dictionaries

Precompiled Japanese and Korean dictionaries exist in [releases](https://github.com/jacoblockett/mecab/releases). Even if you compile the engine yourself, you'll need to find your own dictionaries. This package is configured to work first-class with Japanese and Korean using compiled dictionaries under the following paths:

`node_modules/mecab/dict/mecab-jp-dict`<br/>
`node_modules/mecab/dict/mecab-ko-dict`

So long as you have compiled dictionaries under that path, it will choose the correct engine to use. However, you can also provide your own dictionary to use and pass the path to the `MeCab` class (see: [API Reference](#api-reference)). Whatever dictionary you choose to use, though, just remember that the original MeCab and the Korean patch are only designed to work with Japanese and Korean respectively. Unless you're using your own modified Japanese/Korean dictionaries, I highly recommend just using the dictionaries found in [releases](https://github.com/jacoblockett/mecab/releases).

## Usage

```js
import MeCab from "mecab"
// cjs is also supported, i.e.
// const MeCab = require("mecab")

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

### Signature:

```ts
class MeCab {
	constructor(config: { engine: "jp" | "ko"; dictPath: string })

	parse(text: string): Token[]
}
```

### Class :: `MeCab`

A high-level wrapper to load the MeCab engine using a dictionary driver of your choice.

### Constructor :: `new MeCab(opts)`

Creates a MeCab engine class that can parse specific text.

#### Parameters:

| Name             | Default       | Type     | Description                                                                                                                   |
| ---------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `opts?`          |               | `object` | Options for the instance.                                                                                                     |
| `opts.engine?`   | `"jp"`        | `string` | The language engine to use. The engine must match one of the expected values for the [supported drivers](#supported-drivers). |
| `opts.dictPath?` | internal path | `string` | The absolute path to the directory of the compiled dictionary you plan to use with MeCab.                                     |

#### Supported Drivers:

| Expected Value | Language |
| -------------- | -------- |
| `"jp"`         | Japanese |
| `"ko"`         | Korean   |

### Method :: `MeCab.prototype.parse(text: string): Token[]`

Parses the given text into a tokens.

#### Parameters:

| Name   | Type     | Description        |
| ------ | -------- | ------------------ |
| `text` | `string` | The text to parse. |

#### Returns:

`Token[]`

### Class :: `Token`

A structure representing parsed data provided by MeCab.

| Getter           | Language Driver | Type              | Description                                          |
| ---------------- | --------------- | ----------------- | ---------------------------------------------------- |
| `surface`        | all             | `string`          | The actual text as it appears in the input           |
| `primaryPOS`     | all             | `string`          | The first/main part-of-speech tag                    |
| `allPOS`         | all             | `string[]`        | Array of all part-of-speech tags                     |
| `hasMultiplePOS` | all             | `boolean`         | Whether the token has multiple POS tags              |
| `hasJongseong`   | ko              | `boolean \| null` | Whether the word ends with a final consonant (받침)  |
| `pronunciation`  | all             | `string \| null`  | The pronunciation/reading of the token               |
| `base`           | all             | `string`          | The base/dictionary/lemma form of the word           |
| `conjugation`    | jp              | `object \| null`  | Object with conjugation `type` and `form` properties |
| `type`           | ko              | `string \| null`  | The morpheme type (e.g., "Inflect", "Compound")      |
| `features`       | all             | `string[]`        | Raw array of all feature fields from MeCab output    |
| `raw`            | all             | `string`          | Original tab-separated string format for debugging   |

> 💡 Getters that return `null` do so when the feature doesn't apply to that token or when using a language driver that doesn't support that feature.
