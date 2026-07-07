<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Global Rules

### i18n / Translations
All user-facing text in UI components MUST use `t("...")` translation keys. Hardcoded strings in any language are not allowed. Every new component or modification must add the corresponding keys to both `en.json` and `it.json`.
