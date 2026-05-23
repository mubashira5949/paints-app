# AGENTS.md

Be clear and concise in your explanations. Sacrifice grammar for brevity if needed. Do as much work in SQL as possible, only use JavaScript/TypeScript for orchestration. Follow best practices for security, performance, and maintainability. When in doubt, refer to existing code patterns in this repository.

Do not ask me to execute a command or any other task, unless you explicitly cannot do so.

After reading this document, read all `packages/*/AGENTS.md` files too.

NEVER COMMIT OR PUSH ANYTHING ON YOUR OWN.

# Writing Code

- Use tabs for indentation, not spaces.
- If you feel like making a change in another package eases development, describe the change, explain why & ask for permission

## Typescript

- When importing files, use the extension `.ts`  for TypeScript files.
- Use the "#" prefix for private methods & variables in classes
- Infer types as much as possible, avoid explicit type annotations unless necessary to resolve ambiguity.
- Run typescript files directly using `node`
- Any function declarations within functions should be defined at the end of their parent function.
- Tests use native Node.js test runner, not Jest.
	- Run specific test files via `node test <file>`
	- To run specific test cases, use their name via `--test-name-pattern <pattern>`, or use `.only` on the test case.
	- Only run relevant tests during development, not the entire test suite.
- Follow strict type safety and ESLint rules. Always run lint and typecheck before running code or committing changes. Lint from the root of the monorepo to ensure all files are checked.
	- Use `npm run lint:fix` to check for linting errors from the root
	- Use `npm run build` to check for type errors from the root
- Use `@hapi/boom` for coded errors. Do not create custom error classes. Instead, use Boom's built-in error types and status codes to handle different error scenarios.
- Do not import files from packages directly, use the `import { ... } from '@scope/<package>'` syntax to ensure proper encapsulation and avoid circular dependencies. The only exception is when importing test utils, and only in test files.
- Use assert from `assert` module instead of if statements for error handling. This ensures that the code is readable and concise, and that errors are thrown with clear messages. For example, instead of writing:
	```ts
	import assert from 'assert'
	import { notFound } from '@hapi/boom'
	// bad:
	if(!user) {
		throw new Error('User not found')
	}
	// good:
	assert(user, notFound('User not found'))
	```
- When adding tests, do not add separate tests for logic that gets covered by existing or new tests. For example, if you have A -> B -> C, and you add a test for A that covers the logic in B and C, you do not need to add separate tests for B and C. This ensures that our tests are focused on the behavior of the code, rather than the implementation details. Only caveat is if B and C have some edge cases that are not covered by the test for A, then you can add separate tests for those edge cases in B and C.
- Tests should be focused on testing the behavior of the code, rather than the implementation details. For example.
- Do not cast variables unless there's a very good reason to do so, must be accompanied by a comment explaining why casting was necessary
- Optional assignment should be done via the `||=` or `??=` operators, not via if statements. This ensures that the code is concise and easy to read. For example, instead of writing:
	```ts
	if(!x) {
		x = defaultValue
	}
	```
	Write:
	```ts
	x ||= defaultValue
	```

## SQL

- We use PostgresSQL as our database, and all SQL code should be written in `.sql` files.
- All SQL files must be placed in the package's `sql` directory, and follow either `ddl.sql`, or `<num>.<name>.ddl.sql` for schema changes, and `queries.sql` if using pgtyped for query generation. Avoid inline SQL in TypeScript files.
- When inserting composite types with many fields, use `jsonb_populate_record` to avoid having to list out all the fields in the insert statement. For example:
	```sql
	insert into my_table
	select * from jsonb_populate_record(null::my_table, $1::jsonb)
	```
- When reading comcomposite types, use `to_jsonb` to convert the record to JSON, for easy reading. Otherwise Postgres will return the composite type as a string, which is difficult to work with. For example:
	```sql
	select to_jsonb(my_table) from my_table where id = $1
	```
- Aim to do as much work in SQL as possible, and only use TypeScript for orchestration. Business logic when possible, should be implemented in SQL via functions and procedures, and called from TypeScript. This ensures that the logic is executed close to the data, improving performance and reducing the amount of data that needs to be transferred between the database and the application.

### PGTyped

PGTyped is used for generating type-safe SQL queries in TypeScript from a SQL file. This allows us to write SQL queries in a separate file, and have the types automatically generated for us, ensuring that our queries are type-safe and reducing the likelihood of runtime errors due to type mismatches.

Each package has its own `sql/queries.sql` file where all SQL queries that require type generation should be placed.

As we work in a mono-repo, the types for all packages are generated together and placed in `src/queries.ts` for the respective package.

Use `npm run pgtyped:typegen` to generate types after adding new queries or modifying existing ones. This command should be run from the root of the monorepo to ensure that all packages are checked and updated accordingly.
