import "./loadEnv.js";
import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { createContext } from "./context.js";
import { schema } from "./schema/index.js";

const port = Number(process.env.PORT ?? 4001);

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/graphql",
  cors: {
    origin: ["http://localhost:5174", "http://127.0.0.1:5174"],
    credentials: true,
  },
});

const server = createServer(yoga);
server.listen(port, () => {
  console.log(`GraphQL API http://localhost:${port}/graphql`);
});
