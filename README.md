# link-to-qr

Turn any URL into a QR code — instantly, privately, entirely in your browser.

**🔗 Live tool: <https://nangti.github.io/link-to-qr/>**

## Features

- Paste a link (or just type `example.com` — `https://` is added automatically)
- Live QR preview as you type
- Download as **PNG** (512–4096 px) or crisp vector **SVG**
- Copy the QR image straight to your clipboard
- 100% client-side: no server, no tracking, works offline once loaded
- Shareable: append `?u=<link>` to the tool URL to open it with the QR ready-made

## Run locally

It's plain static files — just open `index.html`, or:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

Hosted on [GitHub Pages](https://pages.github.com/) straight from this repository.
If you fork it: **Settings → Pages → Deploy from a branch → branch: `main`, folder: `/`**.

## Credits

QR encoding by [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
(MIT), vendored under [`vendor/`](vendor/qrcode-generator/).

## License

[MIT](LICENSE)
