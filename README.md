# Word Shifter — 静的サイト版

このリポジトリに静的なフロントエンドを追加しました。`index.html` を GitHub Pages (github.io) で公開できます。

使い方
- このレポジトリを GitHub に push します。
- リポジトリの Settings → Pages で `main` ブランチ（または `gh-pages`）のルートを公開先に指定すると公開されます。

特徴
- 既存の `dictionary/kobuta.txt` と `dictionary/ippan.txt` を候補として読み込みます（存在するファイルのみ表示）。
- `alt.csv` を読み込み、編集が可能です。
- 「変換可能な単語ペアを探す」で結果を画面表示し、CSVでダウンロードできます。

公開上の注意
- GitHub Pages は静的サイトなので、サーバ側ファイル操作はできません。`dictionary/*.txt` と `alt.csv` はリポジトリに含まれている必要があります。
