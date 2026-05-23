# Instructions for LLM Agents

1. Use as flat a structure as possible, avoid unnecessary nesting of elements. This makes the DOM faster to traverse and manipulate, improving performance.
2. Prefer using "padding" for spacing instead of "margin" when possible, as padding is more efficient for the browser to render and can help reduce layout shifts.
3. When spacing elements, use gap & not padding on a particular side.
4. Transition times for simple animations like hover should be 0.1s
5. Do not create your own icons, use material symbols. If an appropriate icon does not exist, ask for appropriate steps with the user before proceeding.
6. Always scan the codebase for existing components/CSS/utilities that can be reused before creating new ones. This ensures consistency across the codebase and reduces the amount of code you need to write.
7. Do not keep overusing divs, instead use the appropriate semantic HTML elements. This gives us more meaningful markup, improves accessibility, and can enhance SEO. For example, use <button> for clickable elements, <header> for page headers, <section> for distinct sections of content, etc.
8. When implementing a new route:
	- implement route in "routes" folder, and ensure to use the generated types for request/response validation.

# Tests

Always write tests for your code, especially for critical functionality. This helps catch bugs early and ensures that your code works as expected.

Before running tests, ensure the project is built via `npm run build` as the tests run on the built code in the "lib" folder.

1. Ensure tests are E2E & model user behavior as closely as possible.
2. We use `happy-dom` to simulate a browser environment for our tests. Ensure when testing UI-backend interactions, you simulate clicks & keyboard events to trigger the necessary UI updates and backend calls. This ensures that your tests are more realistic and can catch issues that may arise from user interactions.

# Specific Component Usage

Find below instructions for specific component usage

## Dialog

1. Always keep a close button on the top right corner of the dialog, allowing users to easily close the dialog without having to search for a specific button. This improves user experience and accessibility. Do not add a "cancel" button at the bottom of the dialog, as it can create confusion and clutter the interface.
2. If the heading has only text, do not use "dialog-title" directly under "dialog-content"
3. Avoid dialogs on top of dialogs. Come up with an alternative solution instead. Only if absolutely necessary, use a dialog on top of a dialog, and confirm with the user before proceeding with implementation.
