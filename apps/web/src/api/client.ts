import { GraphQLClient } from "graphql-request";

const endpoint =
  import.meta.env.VITE_GRAPHQL_URL?.trim() || "/graphql";

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    "Content-Type": "application/json",
  },
});
