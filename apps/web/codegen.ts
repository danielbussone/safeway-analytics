import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.VITE_GRAPHQL_URL ?? "http://127.0.0.1:4001/graphql",
  documents: ["src/graphql/**/*.ts"],
  generates: {
    "src/graphql/generated.ts": {
      plugins: ["typescript", "typescript-operations"],
    },
  },
};

export default config;
