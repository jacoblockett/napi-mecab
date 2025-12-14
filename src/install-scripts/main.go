package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/alexflint/go-arg"
	"github.com/mholt/archives"
)

type Args struct {
	Lang []string `arg:"-l,--lang" help:"Comma-delimited language codes for which engine/dictionaries to install. Currently supported are jp and ko. If omitted, downloads all languages."`
}

var supported = map[string]bool{
	"jp": true,
	"ko": true,
}

func main() {
	var args Args
	arg.MustParse(&args)

	var requested []string

	if len(args.Lang) == 0 {
		for lang := range supported {
			requested = append(requested, lang)
		}
	} else {
		for _, lang := range args.Lang {
			lower := strings.ToLower(lang)
			if !supported[lower] {
				fmt.Printf("'%s' is not a supported language code\n", lang)
				return
			}

			requested = append(requested, lower)
		}
	}

	// get relative path to package
	exe, err := os.Executable()
	if err != nil {
		fmt.Println(err)
		return
	}

	exeDir := filepath.Dir(exe)

	// get package version
	pkgPath := filepath.Join(exeDir, "..", "package.json")
	version, err := getPkgVersion(pkgPath)
	if err != nil {
		fmt.Println(err)
		return
	}

	release, err := getGithubRelease(version)
	if err != nil {
		fmt.Println(err)
		return
	}

	// setup temporary directory for archive downloads
	tempDir, err := os.MkdirTemp("", "mecab")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer os.RemoveAll(tempDir)

	// download engine into appropriate runtime prebuild directory
	prebuildURL, err := release.getBinaryURL()
	if err != nil {
		fmt.Println(err)
		return
	}

	engineZipPath := filepath.Join(tempDir, "engine.zip")
	err = downloadAsset(prebuildURL, engineZipPath)
	if err != nil {
		fmt.Println(err)
		return
	}

	engineZip, err := os.Open(engineZipPath)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer engineZip.Close()

	prebuildDir := filepath.Join(exeDir, "..", "prebuilds")
	os.RemoveAll(prebuildDir)
	err = os.MkdirAll(prebuildDir, 0755)
	if err != nil {
		fmt.Println(err)
		return
	}

	err = extractAllTo(engineZip, prebuildDir)
	if err != nil {
		fmt.Println(err)
		return
	}

	rt := getRuntime()

	// download requested language dictionaries into /dict
	for _, lang := range requested {
		dictURL, err := release.getDictionaryURL(lang)
		if err != nil {
			fmt.Println(err)
			return
		}

		dictZipPath := filepath.Join(tempDir, fmt.Sprintf("%s.zip", lang))
		err = downloadAsset(dictURL, dictZipPath)
		if err != nil {
			fmt.Println(err)
			return
		}

		dictZip, err := os.Open(dictZipPath)
		if err != nil {
			fmt.Println(err)
			return
		}
		defer dictZip.Close()

		dictDir := filepath.Join(exeDir, "..", "dict", lang)
		os.RemoveAll(dictDir)
		err = os.MkdirAll(dictDir, 0755)
		if err != nil {
			fmt.Println(err)
			return
		}

		err = extractAllTo(dictZip, dictDir)
		if err != nil {
			fmt.Println(err)
			return
		}
	}

	fmt.Printf("Successfully installed prebuilt binary for your %s system and dictionaries for %s\n", rt, strings.Join(requested, ", "))
}

type GithubRelease struct {
	Version string        `json:"tag_name"`
	Assets  []GithubAsset `json:"assets"`
}

type GithubAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

func getGithubRelease(version string) (*GithubRelease, error) {
	res, err := http.Get(fmt.Sprintf("https://api.github.com/repos/jacoblockett/napi-mecab/releases/tags/v%s", version))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch release info, bad status: %s", res.Status)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	var release GithubRelease
	err = json.Unmarshal(body, &release)
	if err != nil {
		return nil, err
	}

	return &release, nil
}

func (r *GithubRelease) getBinaryURL() (string, error) {
	name := fmt.Sprintf("prebuilds-%s-%s-%s.zip", runtime.GOOS, r.Version, getArch())

	for _, asset := range r.Assets {
		if asset.Name == name {
			return asset.URL, nil
		}
	}

	return "", fmt.Errorf("couldn't find a prebuild for %s", name)
}

func (r *GithubRelease) getDictionaryURL(lang string) (string, error) {
	name := fmt.Sprintf("%s.zip", lang)

	for _, asset := range r.Assets {
		if asset.Name == name {
			return asset.URL, nil
		}
	}

	return "", fmt.Errorf("couldn't find a dictionary for %s", name)
}

func getRuntime() string {
	p := runtime.GOOS
	if p == "windows" {
		p = "win32"
	}

	a := getArch()

	return fmt.Sprintf("%s-%s", p, a)
}

func getArch() string {
	a := runtime.GOARCH
	if a == "amd64" {
		a = "x64"
	}

	return a
}

type Pkg struct {
	Version string `json:"version"`
}

func getPkgVersion(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	var pkg Pkg
	err = json.Unmarshal(data, &pkg)
	if err != nil {
		return "", err
	}

	return pkg.Version, nil
}

func downloadAsset(url, destination string) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "application/octet-stream")
	req.Header.Set("User-Agent", "napi-mecab-installer")

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			req.Header.Set("Accept", "application/octet-stream")
			req.Header.Set("User-Agent", "napi-mecab-installer")
			return nil
		},
	}

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("%s bad status: %s", url, res.Status)
	}

	out, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, res.Body)
	return err
}

func extractAllTo(zipFile *os.File, destination string) error {
	var format archives.Zip

	return format.Extract(context.Background(), zipFile, func(ctx context.Context, info archives.FileInfo) error {
		outPath := filepath.Join(destination, info.NameInArchive)

		if info.IsDir() {
			return os.MkdirAll(outPath, 0755)
		}

		os.MkdirAll(filepath.Dir(outPath), 0755)
		out, err := os.Create(outPath)
		if err != nil {
			return err
		}
		defer out.Close()

		in, err := info.Open()
		if err != nil {
			return err
		}
		defer in.Close()

		_, err = io.Copy(out, in)
		return err
	})
}
