# [Cleaver](https://github.com/jdan/cleaver): Select Theme

Hi there, my handle is "select" and this theme shows a slide overview that allows you to select a slide with a click, thus the name.

While I liked the [reveal theme](https://github.com/sudodoki/reveal-cleaver-theme) I was not able to configure it, and anyway I just wanted to have the slide overview, so I extended the [cleaver-light theme] (https://github.com/sjaakvandenberg/cleaver-light) with a **slide overview**. Press <kbd>ESC</kbd> to get the slide overview and click on a slide to navigate to it. Exit the overview with … <kbd>ESC</kbd>.

And since it was quick and fun I also added fragments. Just add tags with the class `.fragment` around the parts that should appear bit by bit.
```
<div class="fragment">Fragment One</div>
<div class="fragment">Fragment Two</div>
<div class="fragment">Fragment Tree</div>
```

Here is a [demo presentation](https://rawgit.com/select/learn-web-development/master/dist/cleaver-select-theme.html).

I also fixed the live reload in the light theme and made the responsive CSS work. Somehow the responsive code was there but acted quite strange.

## Usage

At the beginning of your presentation add

```
theme: select/cleaver-select-theme
```

Put a file called `background-image.jpg` in the same directory as the output HTML presentation to have a nice background image.

I use google fonts since they are easier to switch.

But hey, why use my predefined styles, just [download](https://github.com/select/cleaver-select-theme/archive/master.zip) this theme and customize directly on your computer.
```
theme: ./cleaver-select-theme-master
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Credits

I just discovered cleaver and I must say I love it. Throw some markdown at it, add some HTML, CSS, and JS to spice up your presentation - just prefect. Also thanks to [sjaakvandenberg/cleaver-light](https://github.com/sjaakvandenberg/cleaver-light) and [sudodoki/reveal-cleaver-theme](https://github.com/sudodoki/reveal-cleaver-theme) for code and inspirations.

## License

MIT