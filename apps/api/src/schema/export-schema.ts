import { printSchema } from "graphql";
import { schema } from "./index.js";

console.log(printSchema(schema));
