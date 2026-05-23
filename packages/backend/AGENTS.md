# Instructions for LLM Agents

1. Use as flat a structure as possible, avoid unnecessary nesting of elements. This makes the DOM faster to traverse and manipulate, improving performance.
2. When implementing a new route:
	- it has to be added to the openapi.yaml. Ensure the request parameters are correctly typed, constrained. Ensure max-length, max-items, max properties, etc. are always set where applicable.
	- generate types via `npm run openapi:typegen --workspace=packages/backend`
	- implement route in "routes" folder, and ensure to use the generated types for request/response validation.
	- minimise validation in the javaScript code, and push it to the openapi schema as much as possible. This ensures a single source of truth for validation and reduces the chances of inconsistencies.

# Tests

Always write tests for your code, especially for critical functionality. This helps catch bugs early and ensures that your code works as expected.

Before running tests, ensure the project is built via `npm run build` as the tests run on the built code in the "lib" folder.

1. Ensure tests are E2E & model user behavior as closely as possible.
