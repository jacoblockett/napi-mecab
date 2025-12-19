import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { createRequire } from "module"
import { existsSync, readdirSync } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)
const binding = require("node-gyp-build")(join(__dirname, ".."))
const engineDicts = {
	jp: join(__dirname, "..", "dict", "jp"),
	ko: join(__dirname, "..", "dict", "ko")
}
const JP = "jp" // UniDic
const KO = "ko" // mecab-ko-dic
const EMPTY = "*"
// Tags are based on the mecab-ko-dic POS tag system, unless otherwise noted to be specific to the Sejong POS tag system
const KO_TAGS = {
	nouns: { NNG: true, NNP: true, NNB: true, NNBC: true, NR: true, NP: true },
	verbs: { VV: true, VA: true, VX: true, VCP: true, VCN: true },
	modifiers: { MM: true, MAG: true, MAJ: true },
	independentWords: { IC: true },
	relationalWords: { JKS: true, JKC: true, JKG: true, JKO: true, JKB: true, JKV: true, JKQ: true, JX: true, JC: true },
	preFinalEndings: { EP: true },
	finalEndings: { EF: true, EC: true, ETN: true, ETM: true },
	prefixes: { XPN: true },
	suffixes: { XSN: true, XSV: true, XSA: true },
	roots: { XR: true },
	// SS, SP, SO, SW are Sejong POS tags
	symbols: { SF: true, SE: true, SSO: true, SSC: true, SC: true, SY: true, SS: true, SP: true, SO: true, SW: true },
	nonHangul: { SL: true, SH: true, SN: true }
}

export default class MeCab {
	#engine = JP
	#dictPath = engineDicts[JP]
	#tagger

	/**
	 * Creates a MeCab engine class that can parse specific text.
	 *
	 * @param {object} [opts]
	 * @param {"jp"|"ko"} [opts.engine] Which MeCab language engine to use. jp is the original MeCab, ko is the Korean patch. Default=`"jp"`
	 * @param {string} [opts.dictPath] The path to your custom compiled dictionary. Default=uses the engine dictionary
	 */
	constructor(opts) {
		if (Object.prototype.toString.call(opts) === "[object Object]") {
			if (typeof opts.engine === "string") {
				const engine = opts.engine.trim().toLowerCase()

				if (engineDicts[engine]) {
					this.#engine = engine
					this.#dictPath = engineDicts[engine]
				} else {
					throw new Error(`"${opts.engine}" is not a supported mecab engine.`)
				}
			}

			if (typeof opts.dictPath === "string") {
				this.#dictPath = opts.dictPath.trim()
			}
		}

		if (!existsSync(this.#dictPath)) throw new Error(`"${this.#dictPath}" doesn't exist.`)

		const expectedFiles = ["char.bin", "dicrc", "matrix.bin", "sys.dic", "unk.dic"]
		try {
			const foundFiles = readdirSync(this.#dictPath)

			for (const expectedFile of expectedFiles) {
				if (!foundFiles.includes(expectedFile)) throw ""
			}
		} catch (err) {
			throw new Error(
				`Ensure your dictionary path contains a compiled dictionary. The minimum viable contents should be ${expectedFiles.join(
					", "
				)}.`
			)
		}

		this.#tagger = new binding.Mecab(this.#engine, this.#dictPath)
	}

	/**
	 * Parses the given text into tokens.
	 *
	 * @param {string} text The text to parse.
	 * @returns {Token[]}
	 */
	parse(text) {
		const raw = this.#tagger.parse(text)
		const tokens = []

		for (const line of raw.split(/[\r\n]+/)) {
			if (line === "EOS") break

			const token = new Token(this.#engine, line)

			tokens.push(token)
		}

		return tokens
	}
}

class Token {
	#engine
	#surface
	#features

	/**
	 * A structure representing parsed data provided by MeCab.
	 *
	 * @param {"jp"|"ko"} engine The language engine used to parse the token
	 * @param {string} raw The raw surface and feature set of the token
	 */
	constructor(engine, raw) {
		if (engine !== JP && engine !== KO) {
			throw new Error(`"${engine}" is not a supported mecab engine.`)
		}

		this.#engine = engine

		const [surface, features] = raw.split("\t")

		this.#surface = surface
		this.#features = features.split(",")
	}

	/**
	 * The form of conjugation being used on the word, e.g. present tense, continuative form, etc.
	 *
	 * @note **Japanese only**
	 * @return {string|null}
	 */
	get conjugationForm() {
		if (this.#engine === JP) {
			return this.#features[5] !== EMPTY ? this.#features[5] : null
		}

		return null
	}

	/**
	 * The conjugation type, e.g. regular, irregular, etc.
	 *
	 * @note **Japanese only**
	 * @return {string|null}
	 */
	get conjugationType() {
		if (this.#engine === JP) {
			return this.#features[4] !== EMPTY ? this.#features[4] : null
		}

		return null
	}

	/**
	 * The broken-down details of how the token is formed.
	 *
	 * @note **Korean only**
	 * @returns {string|null}
	 */
	get expression() {
		if (this.#engine === KO) {
			return this.#features[7] !== EMPTY ? this.#features[7].split("+").map(part => new ExpressionToken(part)) : null
		}

		return null
	}

	/**
	 * The raw features string returned by the underlying MeCab engine.
	 *
	 * @returns {string}
	 */
	get features() {
		return this.#features
	}

	/**
	 * The grammatical role this token's form serves within the sentence.
	 *
	 * @note **Japanese only**
	 * @returns {string|null}
	 */
	get grammaticalRole() {
		if (this.#engine === JP) {
			return this.#features[19] !== EMPTY ? this.#features[19] : null
		}

		return null
	}

	/**
	 * Whether the token has a final consonant or not.
	 *
	 * @alias hasJongseong
	 * @note **Korean only**
	 * @returns {boolean|null}
	 */
	get hasBatchim() {
		if (this.#engine === KO) {
			return this.#features[2] === "T"
		}

		return null
	}

	/**
	 * Whether the token has a final consonant or not.
	 *
	 * @alias hasBatchim
	 * @note **Korean only**
	 * @returns {boolean|null}
	 */
	get hasJongseong() {
		if (this.#engine === KO) {
			return this.#features[2] === "T"
		}

		return null
	}

	/**
	 * The actual dictionary headword as the token would appear in a dictionary.
	 *
	 * @returns {string|null}
	 */
	get lemma() {
		if (this.#engine === JP) {
			return this.#features[7]
		}

		if (this.#engine === KO) {
			let base = this.#surface

			if (this.#features[4] !== EMPTY && this.#features[7] !== EMPTY) {
				base = this.#features[7].split("/")[0]
			}

			if (isVerb) base = `${base}다`

			return base
		}
	}

	/**
	 * The orthographic kana spelling of the dictionary form of the token, as you would see in textbooks.
	 *
	 * @note **Japanese only**
	 * @returns {string|null}
	 */
	get lemmaKana() {
		if (this.#engine === JP) {
			return this.#features[6] !== EMPTY ? this.#features[6] : null
		}

		return null
	}

	/**
	 * The natural pronunciation of the dictionary form of the token.
	 *
	 * @note **Japanese only**
	 * @returns {string|null}
	 */
	get lemmaPronunciation() {
		if (this.#engine === JP) {
			return this.#features[11] !== EMPTY ? this.#features[11] : null
		}

		return null
	}

	/**
	 * The origin of the word.
	 *
	 * @note **Japanese only**
	 * @note Includes whether this token is considered a symbol or punctuation
	 * @returns {string|null}
	 */
	get origin() {
		if (this.#engine === JP) {
			return this.#features[12] !== EMPTY ? this.#features[12] : null
		}

		return null
	}

	/**
	 * The pitch accent information indicating where pitch rises/falls in the token.
	 *
	 * @note **Japanese only**
	 * @returns {string|null}
	 */
	get pitch() {
		if (this.#engine === JP) {
			return this.#features[24] !== EMPTY ? this.#features[24] : null
		}

		return null
	}

	/**
	 * The parts of speech that make up this token.
	 *
	 * Japanese: An array with the following potential structure [primary_pos, pos_subcategory_1, pos_subcategory_2, pos_subcategory_3]
	 *
	 * Korean: An array of tags representing what parts of speech exist within the token.
	 *
	 * @returns {string[]}
	 */
	get pos() {
		if (this.#engine === JP) {
			const list = [this.#features[0]]

			if (this.#features[1] !== EMPTY) list.push(this.#features[1])
			if (this.#features[2] !== EMPTY) list.push(this.#features[2])
			if (this.#features[3] !== EMPTY) list.push(this.#features[3])

			return list
		}

		if (this.#engine === KO) {
			return this.#features[0].split("+")
		}
	}

	/**
	 * How the token, as written, is pronounced.
	 *
	 * @returns {string|null}
	 */
	get pronunciation() {
		if (this.#engine === JP) {
			return this.#features[9] !== EMPTY ? this.#features[9] : null
		}

		if (this.#engine === KO) {
			return this.#features[3] !== EMPTY ? this.#features[3] : null
		}
	}

	/**
	 * The raw string returned by the underlying MeCab engine.
	 *
	 * @returns {string}
	 */
	get raw() {
		return `${this.#surface}\t${this.#features.join(",")}`
	}

	/**
	 * The semantic word class or category this token belongs to.
	 *
	 * @note **Korean only**
	 * @returns {string|null}
	 */
	get semanticClass() {
		if (this.#engine === KO) {
			return this.#features[1] !== EMPTY ? this.#features[1] : null
		}

		return null
	}

	/**
	 * How the token looks in the input text you provided.
	 *
	 * Japanese: For some compound analysis, the surface form may be slightly different from the
	 * first column form found in the raw results.
	 *
	 * @returns {string}
	 */
	get surface() {
		if (this.#engine === JP && this.#features[8] !== EMPTY) {
			return this.#features[8]
		}

		return this.#surface
	}

	/**
	 * The type of token this token is, e.g. inflection, compound noun, etc.
	 *
	 * @note **Korean only**
	 * @returns {string|null}
	 */
	get type() {
		if (this.#engine === KO) {
			return this.#features[4] !== EMPTY ? this.#features[4] : null
		}

		return null
	}
}

class ExpressionToken {
	#features

	/**
	 * An expression piece of a larger expression whole that details the individual tokens that make up an agglutinated token.
	 *
	 * @note **Korean only**
	 *
	 * @param {string} raw The raw expression string
	 */
	constructor(raw) {
		this.#features = raw.split("/")
	}

	/**
	 * The normalized token.
	 *
	 * @returns {string}
	 */
	get morpheme() {
		return this.#features[0]
	}

	/**
	 * The part of speech of the token.
	 *
	 * @returns {string}
	 */
	get pos() {
		return this.#features[1]
	}

	/**
	 * The semantic word class or category this token belongs to.
	 *
	 * @returns {string|null}
	 */
	get semanticClass() {
		return this.#features[2] !== EMPTY ? this.#features[2] : null
	}
}
