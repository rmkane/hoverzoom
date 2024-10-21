const plugin = new HoverZoomModalPlugin({
  theme: RedTheme,
});

let flip = false;
setInterval(() => {
  flip = !flip;
  plugin.updateTheme(flip ? HoverZoomModalPlugin.defaultTheme : RedTheme);
}, 1000);
