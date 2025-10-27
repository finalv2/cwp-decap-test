# Child Welfare Playbook

This repository contains a redesign of childwelfareplaybook.com. The redesigned version launched in September 2025.

Below, we'll refer to the site (or the Child Welfare Playbook as a whole) as "CWP."

## Bootstrapping

1. Clone this repo
2. `cd` to the base directory
3. `npm i && npm start`

## Architecture

CWP is an [11ty](https://11ty.dev) project hosted on [Netlify](https://www.netlify.com/).

It uses [DecapCMS](http://decapcms.org/) for the admin UI with auth handled via GitHub.

### Libraries

- All icons are from [Phosphor Icons](https://phosphoricons.com/).
- We use [lite-youtube](https://github.com/justinribeiro/lite-youtube) to improve load times when embedding community meeting videos.
- Site search uses the [Pagefind](https://pagefind.app/) API with a custom UI.

## File structure

- `/_data/` contains text for various static pages throughout the app, most of which admins can edit within DecapCMS.
- `/_includes/css/` contains all CSS for the project. It is then bundled and minifed within `/theme.njk`.
- `/_macros/` contains Nunjucks macros for most of the components we use throughout the site.
- `/admin/` contains the admin UI for this project.
  - `/admin/config.yml` stores all [DecapCMS settings](https://decapcms.org/docs/configuration-options/), including the fields for each content type.
  - `/admin/index.html` references DecapCMS itself, as well as the [preview templates](https://decapcms.org/docs/customization/#registerpreviewtemplate) for each page type.
- `/fonts/` contains CWP's brand typefaces: Libre Franklin and Space Mono. Netlify's built-in asset optimization can lead to slower page load times for externally hosted files. So the site hosts fonts locally instead of using the Google Fonts CDN.
- `/icons/` contains the [Phosphor Icons](https://phosphoricons.com/) we use on the site. We then [bundle these icons into an SVG sprite](https://github.com/patrickxchong/eleventy-plugin-svg-sprite) which we embed in our default layout (`_includes/layouts/default.njk`).

- Most CWP content is stored in Markdown in their respective folders:
  - `/meetings/`
  - `/resources/`
  - `/stories/`
  - `/strategies/`
  - `/topics/`


## Project history

The previous site design is hosted at [bloom-works/child-welfare-playbook](https://github.com/bloom-works/child-welfare-playbook).

For unknown reasons, the `main` branch of that repo has no commits prior to 2024. To browse early versions of the site going back to 2021, switch to [the `NEW-CA-Counties` branch](https://github.com/bloom-works/child-welfare-playbook/tree/NEW-CA-Counties).
