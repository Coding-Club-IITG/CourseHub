# CourseHub's shared interface

The student and administrator applications use the same black, warm yellow and Proxima Nova foundations. `@coursehub/ui` provides controls with scoped SCSS modules.

## Tokens and SCSS

Importing a component loads namespaced `--ch-*` CSS variables and the existing font assets. The font family has explicit 100, 400, 700 and 900 weight declarations and Arial/sans-serif fallbacks. The temporary legacy font-family aliases let existing student screens keep their appearance while their consumers migrate; the actual font files have one shared home.

Use SCSS modules for component styles. Shared tokens describe colors, typography and dimensions. Mixins describe reusable layout and control rules. Import the shared mixins with `@use "@coursehub/ui/mixins" as ui`. For example:

```scss
@use "@coursehub/ui/mixins" as ui;

.panel {
    @include ui.surface;
    @include ui.stack(1rem);
    padding: 1.5rem;
}

@include ui.below(mobile) {
    .panel {
        padding: 1rem;
    }
}
```

The `control`, `focus-ring`, `actions`, `stack`, `surface`, `section-padding`, `below` and `reduced-motion` mixins keep controls, layouts and responsive rules consistent. Component styles never introduce global button, input or dialog selectors.

## Controls and states

`Button` defaults to `type="button"`, preventing accidental form submission. Set `type="submit"` deliberately. Its primary, dark, secondary, danger, ghost and link variants share a 44px minimum target and visible keyboard focus. `busy` disables repeat activation - provide `busyLabel` for the action's current state. `IconButton` requires a meaningful `label` and accepts existing icon artwork as children.

`FormField` wraps one native input, select or textarea. It connects the visible label, hint and error to that element, retaining caller-supplied descriptions. A required field carries the native required constraint, and an error sets `aria-invalid` and an announced error message. Values, validation and submit behavior belong to the screen.

`Badge` provides neutral, success, warning, danger and info tones. Always include text describing the status - color alone cannot communicate pending approval or failure. `LoadingState`, `ErrorState` and `EmptyState` accept explanatory content and actions. ErrorState renders only the safe message and request ID supplied by the caller.

## Controlled dialogs

```jsx
<Dialog
    open={editing}
    onOpenChange={setEditing}
    title="Rename folder"
    description="This folder is shared by CS101 and MA101."
    busy={saving}
    footer={
        <Button type="submit" form="rename" busy={saving}>
            Save name
        </Button>
    }
>
    <form id="rename" onSubmit={save}>
        <FormField label="Folder name" error={error}>
            <input value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
    </form>
</Dialog>
```

Dialog uses [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog) for modal focus, Escape and background locking. Its body scrolls within the available viewport while the footer remains reachable. `initialFocusRef` can choose the first focused element; `returnFocusRef` can supply a surviving trigger when a provider or URL opens the dialog. Otherwise it restores the element active when it opened.

A busy dialog blocks dismissal during a short save. Long uploads should remain dismissible: closing their details does not cancel accepted server work. Use the existing explicit cancellation workflow for unfinished uploads.

`ConfirmDialog` uses [Radix Alert Dialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog), initially focuses Cancel and ignores outside clicks. Give it specific impact text, `confirmLabel`, `onConfirm` and any request `error`. The caller closes it after a successful request.

## Gallery

From the repository root, run `npm run gallery --workspace @coursehub/ui` and open `http://localhost:48233`. This separate local gallery uses synthetic content. It includes long scrollable content, nested confirmation, failure, disabled/busy controls, all status tones and form examples. `npm run gallery:build --workspace @coursehub/ui` checks its standalone build.
